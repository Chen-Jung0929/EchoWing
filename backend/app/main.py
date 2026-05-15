from __future__ import annotations

import asyncio
import logging
import re
from contextlib import asynccontextmanager

import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.audio_mel import configure_torch_threads, load_waveform_fixed_chunk
from app.config import Settings, get_settings
from app.inference import BirdChunkPredictor
from app.schemas import ChunkPrediction, PredictResponse, TopKItem

logger = logging.getLogger(__name__)

CHUNK_FILENAME_RE = re.compile(r"chunk_(\d+)", re.IGNORECASE)


def filename_sort_key(filename: str | None, upload_order: int) -> tuple[int, int, int]:
    """Sort by chunk index when present; otherwise stable behind indexed uploads."""
    name = filename or ""
    m = CHUNK_FILENAME_RE.search(name)
    if m:
        return (0, int(m.group(1)), upload_order)
    return (1, upload_order, 0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_torch_threads(settings.num_threads)
    app.state.settings = settings
    app.state.predictor = BirdChunkPredictor(settings)
    app.state.prediction_sem = asyncio.Semaphore(settings.max_concurrent_predictions)
    logger.info(
        "Loaded predictor: %s classes, model=%s",
        len(app.state.predictor.labels),
        settings.onnx_model_path,
    )
    yield


app = FastAPI(title="TriageLens Audio Predict", lifespan=lifespan)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": str(exc.detail)},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    ok: bool
    num_classes: int


@app.get("/api/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    pred = request.app.state.predictor
    return HealthResponse(ok=True, num_classes=len(pred.labels))


def _top_k_from_probs(probs: np.ndarray, labels: list[str], k: int) -> list[TopKItem]:
    k_eff = max(1, min(k, len(labels), len(probs)))
    idxs = np.argsort(-probs)[:k_eff]
    return [TopKItem(label=labels[i], score=float(probs[i])) for i in idxs]


def _process_multipart_chunks(
    predictor: BirdChunkPredictor,
    settings: Settings,
    blobs: list[tuple[int, bytes, str | None]],
    *,
    original_filename: str,
    claimed_sample_rate: int,
    warnings: list[str],
) -> PredictResponse:
    """
    blobs: list of (chunk_index, raw_bytes, filename_for_errors) sorted by chunk_index.
    """
    labels = predictor.labels
    by_index = sorted(blobs, key=lambda x: x[0])
    seen: set[int] = set()
    for idx, _, _ in by_index:
        if idx in seen:
            raise ValueError(f"duplicate chunk index in request: {idx}")
        seen.add(idx)

    indices_ok: list[int] = []
    tensors_ok: list[torch.Tensor] = []
    errors: dict[int, str] = {}

    for idx, raw, _fn in by_index:
        try:
            w = load_waveform_fixed_chunk(raw, settings, predictor.device, format_hint="wav")
            tensors_ok.append(w.squeeze(0))
            indices_ok.append(idx)
        except Exception as exc:  # noqa: BLE001 — return per-chunk error to client
            logger.warning("chunk %s decode failed: %s", idx, exc)
            errors[idx] = "decode_failed"

    prob_by_idx: dict[int, np.ndarray] = {}
    if tensors_ok:
        stacked = torch.stack(tensors_ok, dim=0).unsqueeze(1)
        probs_all = predictor.predict_waveform_batch(stacked)
        prob_by_idx = dict(zip(indices_ok, probs_all))

    top_k_n = settings.response_top_k
    chunks_out: list[ChunkPrediction] = []
    for idx, _, _ in by_index:
        if idx in errors:
            chunks_out.append(ChunkPrediction(index=idx, error=errors[idx]))
            continue
        p = prob_by_idx[idx]
        p_adj = np.clip(p - predictor.baseline, 0.0, 1.0)
        chunks_out.append(
            ChunkPrediction(
                index=idx,
                probs=p_adj.tolist(),
                top_k=_top_k_from_probs(p_adj, labels, top_k_n),
                error=None,
            )
        )

    if claimed_sample_rate != settings.sample_rate:
        warnings = [
            *warnings,
            (
                f"sample_rate field was {claimed_sample_rate}, "
                f"server uses {settings.sample_rate} for inference"
            ),
        ]

    return PredictResponse(
        labels=labels,
        chunks=chunks_out,
        original_filename=original_filename,
        sample_rate=settings.sample_rate,
        warnings=warnings,
    )


@app.post("/api/predict", response_model=PredictResponse)
async def predict(
    request: Request,
    audio_chunks: list[UploadFile] = File(...),
    original_filename: str = Form(""),
    sample_rate: int = Form(32_000),
) -> PredictResponse:
    settings: Settings = request.app.state.settings
    predictor: BirdChunkPredictor = request.app.state.predictor
    sem: asyncio.Semaphore = request.app.state.prediction_sem

    cl = request.headers.get("content-length")
    if cl is not None:
        try:
            n_bytes = int(cl)
        except ValueError:
            n_bytes = 0
        max_b = settings.max_body_mb * 1024 * 1024
        if n_bytes > max_b:
            raise HTTPException(
                status_code=413,
                detail={"message": f"Request body too large (max {settings.max_body_mb} MB)"},
            )

    if not audio_chunks:
        raise HTTPException(
            status_code=422,
            detail={"message": "No audio_chunks uploaded"},
        )

    if len(audio_chunks) > settings.max_chunks:
        raise HTTPException(
            status_code=422,
            detail={"message": f"Too many audio_chunks (max {settings.max_chunks})"},
        )

    indexed = list(enumerate(audio_chunks))
    indexed.sort(key=lambda it: filename_sort_key(it[1].filename, it[0]))

    warnings: list[str] = []
    if any(
        not CHUNK_FILENAME_RE.search(uf.filename or "") for _, uf in indexed
    ):
        warnings.append(
            "Some files did not match chunk_<index>.wav; index falls back to upload order."
        )

    blobs: list[tuple[int, bytes, str | None]] = []
    for upload_order, uf in indexed:
        name = uf.filename or ""
        m = CHUNK_FILENAME_RE.search(name)
        chunk_idx = int(m.group(1)) if m else upload_order
        data = await uf.read()
        if not data:
            raise HTTPException(
                status_code=422,
                detail={"message": f"Empty file: {name or 'unnamed'}"},
            )
        blobs.append((chunk_idx, data, name))

    try:
        async with sem:
            return await run_in_threadpool(
                _process_multipart_chunks,
                predictor,
                settings,
                blobs,
                original_filename=original_filename,
                claimed_sample_rate=sample_rate,
                warnings=warnings,
            )
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"message": str(e)}) from e
