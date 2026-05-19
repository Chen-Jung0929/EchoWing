from __future__ import annotations

import asyncio
import logging
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.adjustion import load_taxonomy_map
from app.audio_mel import configure_torch_threads, load_waveform_fixed_chunk
from app.config import Settings, get_settings
from app.inference import BirdChunkPredictor
from app.schemas import (
    ChunkPrediction,
    DecisionSupport,
    Prediction,
    PredictResponse,
    TopClass,
    TopSpecies,
    ZhAndEn,
)

logger = logging.getLogger(__name__)

CHUNK_FILENAME_RE = re.compile(r"chunk_(\d+)", re.IGNORECASE)
ATTENTION_BINS = 10

DISCLAIMER = ZhAndEn(
    zh=(
        "免責聲明：本網站之 AI 模組僅提供分析與行動建議，不作最後決定。"
        "本平台不保證辨識結果之絕對正確性，亦不構成預測承諾、最終決策或行為保證。"
    ),
    en=(
        "Disclaimer: The AI module of this website provides analysis and "
        "decision-support suggestions only. It does not make final decisions. "
        "The platform does not guarantee absolute correctness and should not be "
        "interpreted as a prediction guarantee, final decision, or behavioral assurance."
    ),
)


def filename_sort_key(filename: str | None, upload_order: int) -> tuple[int, int, int]:
    """Sort by chunk index when present; otherwise stable behind indexed uploads."""
    name = filename or ""
    m = CHUNK_FILENAME_RE.search(name)
    if m:
        return (0, int(m.group(1)), upload_order)
    return (1, upload_order, 0)


def _make_analysis_id(chunk_index: int) -> str:
    day = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"req_{day}_chunk_{chunk_index:03d}"


def _format_attention_weights(
    attn: np.ndarray | None, *, bins: int = ATTENTION_BINS
) -> list[float]:
    if attn is None or attn.size == 0:
        return [0.0] * bins
    flat = np.asarray(attn, dtype=np.float32).reshape(-1)
    if flat.size >= bins:
        weights = flat[:bins]
    else:
        weights = np.pad(flat, (0, bins - flat.size))
    total = float(weights.sum())
    if total > 0:
        weights = weights / total
    return [float(x) for x in weights]


def _build_top_species(
    probs: np.ndarray,
    labels: list[str],
    taxonomy: dict[str, dict[str, str]],
    k: int,
) -> list[TopSpecies]:
    k_eff = max(1, min(k, len(labels), len(probs)))
    idxs = np.argsort(-probs)[:k_eff]
    out: list[TopSpecies] = []
    for i in idxs:
        species_id = labels[i]
        meta = taxonomy.get(species_id, {})
        common = meta.get("com_name") or species_id
        scientific = meta.get("sci_name") or common
        out.append(
            TopSpecies(
                species_id=species_id,
                name=ZhAndEn(zh=common, en=common or scientific),
                probability=float(probs[i]),
            )
        )
    return out


def _build_top_classes(
    probs: np.ndarray,
    labels: list[str],
    taxonomy: dict[str, dict[str, str]],
    k: int,
) -> list[TopClass]:
    k_eff = max(1, min(k, len(labels), len(probs)))
    idxs = np.argsort(-probs)[:k_eff]
    class_counts: dict[str, int] = {}
    out: list[TopClass] = []
    for i in idxs:
        species_id = labels[i]
        meta = taxonomy.get(species_id)
        if not meta:
            continue
        class_counts[meta["class"]] = class_counts.get(meta["class"], 0) + 1

    ranked = sorted(class_counts.items(), key=lambda item: -item[1])[:k_eff]
    for cls, count in ranked:
        out.append(
            TopClass(
                class_name=ZhAndEn(zh=cls, en=cls),
                probability=count / k_eff,
            )
        )
    return out


def _build_decision_support(top_species: list[TopSpecies]) -> DecisionSupport:
    if not top_species:
        return DecisionSupport(
            risk_analysis=ZhAndEn(
                zh="無法取得有效預測結果。",
                en="No valid prediction could be produced.",
            ),
            action_recommendation=ZhAndEn(
                zh="請重新上傳音訊或檢查檔案格式。",
                en="Please re-upload the audio or verify the file format.",
            ),
            disclaimer=DISCLAIMER,
        )

    top = top_species[0]
    pct = int(round(top.probability * 100))
    name_zh = top.name.zh
    name_en = top.name.en

    return DecisionSupport(
        risk_analysis=ZhAndEn(
            zh=(
                f"信心水準達 {pct}%，預測結果為 {name_zh}。"
                f"此 5 秒片段的聲學特徵與模型訓練物種分布一致。"
            ),
            en=(
                f"The confidence level reached {pct}% for {name_en}. "
                "The acoustic features in this 5-second segment align with the model's "
                "trained species distribution."
            ),
        ),
        action_recommendation=ZhAndEn(
            zh=(
                "建議將此辨識結果作為參考紀錄。"
                "若用於嚴謹的生態調查，建議輔以實地觀察或影像進行二次確認。"
            ),
            en=(
                "This result may be used as a reference record. "
                "For rigorous ecological surveys, secondary confirmation using "
                "field observation or visual evidence is recommended."
            ),
        ),
        disclaimer=DISCLAIMER,
    )


def _chunk_from_probs(
    *,
    chunk_index: int,
    probs: np.ndarray,
    labels: list[str],
    taxonomy: dict[str, dict[str, str]],
    top_k: int,
    attention_row: np.ndarray | None,
) -> ChunkPrediction:
    top_species = _build_top_species(probs, labels, taxonomy, top_k)
    top_classes = _build_top_classes(probs, labels, taxonomy, top_k)
    predictions = Prediction(
        top_species=top_species,
        top_classes=top_classes,
        attention_weights=_format_attention_weights(attention_row),
    )
    return ChunkPrediction(
        index=chunk_index,
        analysis_id=_make_analysis_id(chunk_index),
        predictions=predictions,
        decision_support=_build_decision_support(top_species),
        error=None,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_torch_threads(settings.num_threads)
    app.state.settings = settings
    app.state.predictor = BirdChunkPredictor(settings)
    app.state.taxonomy = load_taxonomy_map(settings.taxonomy_csv_path)
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


def _process_multipart_chunks(
    predictor: BirdChunkPredictor,
    settings: Settings,
    taxonomy: dict[str, dict[str, str]],
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
            w = load_waveform_fixed_chunk(
                raw, settings, predictor.device, format_hint="wav"
            )
            tensors_ok.append(w.squeeze(0))
            indices_ok.append(idx)
        except Exception as exc:  # noqa: BLE001 — return per-chunk error to client
            logger.warning("chunk %s decode failed: %s", idx, exc)
            errors[idx] = "decode_failed"

    prob_by_idx: dict[int, np.ndarray] = {}
    attn_by_idx: dict[int, np.ndarray] = {}
    if tensors_ok:
        stacked = torch.stack(tensors_ok, dim=0).unsqueeze(1)
        probs_all, attention_all = predictor.predict_waveform_batch(stacked)
        for i, idx in enumerate(indices_ok):
            p = probs_all[i]
            prob_by_idx[idx] = np.clip(p - predictor.baseline, 0.0, 1.0)
            if attention_all is not None:
                attn_by_idx[idx] = attention_all[i]

    top_k_n = settings.response_top_k
    chunks_out: list[ChunkPrediction] = []
    for idx, _, _ in by_index:
        if idx in errors:
            chunks_out.append(
                ChunkPrediction(
                    index=idx,
                    analysis_id=_make_analysis_id(idx),
                    predictions=None,
                    decision_support=None,
                    error=errors[idx],
                )
            )
            continue
        chunks_out.append(
            _chunk_from_probs(
                chunk_index=idx,
                probs=prob_by_idx[idx],
                labels=labels,
                taxonomy=taxonomy,
                top_k=top_k_n,
                attention_row=attn_by_idx.get(idx),
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
        chunks=chunks_out,
        original_filename=original_filename,
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
    taxonomy: dict[str, dict[str, str]] = request.app.state.taxonomy
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
                detail={
                    "message": f"Request body too large (max {settings.max_body_mb} MB)"
                },
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
    if any(not CHUNK_FILENAME_RE.search(uf.filename or "") for _, uf in indexed):
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
                taxonomy,
                blobs,
                original_filename=original_filename,
                claimed_sample_rate=sample_rate,
                warnings=warnings,
            )
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"message": str(e)}) from e
