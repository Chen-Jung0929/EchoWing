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
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.audio_mel import load_waveform_fixed_chunk
from app.config import Settings, get_settings
from app.inference import BirdChunkPredictor
from app.model_loader import (
    ModelStatus,
    ensure_models_loaded,
    schedule_warmup,
    status_payload,
)
from app.xai import generate_occlusion_heatmap
from app.schemas import (
    ChunkPrediction,
    DecisionSupport,
    Prediction,
    PredictResponse,
    SpectrogramPayload,
    TopClass,
    TopSpecies,
    ZhAndEn,
)
from app.spectrogram import compute_spectrogram_payload

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


def _resolve_model(model_selection: str, predictors: dict) -> str:
    """Single-model inference only (no ensemble)."""
    if model_selection in predictors:
        return model_selection
    return "perch"


def _taxonomy_for_model(
    model_name: str,
    taxonomy_by_model: dict[str, dict[str, dict[str, str]]] | None,
    default_taxonomy: dict[str, dict[str, str]],
) -> dict[str, dict[str, str]]:
    if taxonomy_by_model and model_name in taxonomy_by_model:
        return taxonomy_by_model[model_name]
    return default_taxonomy


def filename_sort_key(filename: str | None, upload_order: int) -> tuple[int, int, int]:
    """Sort by chunk index when present; otherwise stable behind indexed uploads."""
    name = filename or ""
    m = CHUNK_FILENAME_RE.search(name)
    if m:
        return (0, int(m.group(1)), upload_order)
    return (1, upload_order, 0)


def _make_analysis_id(chunk_index: int, model_name: str | None = None) -> str:
    day = datetime.now(timezone.utc).strftime("%Y%m%d")
    if model_name:
        return f"req_{day}_{model_name}_chunk_{chunk_index:03d}"
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
    *,
    threshold: float,
) -> tuple[list[TopSpecies], list[TopSpecies], bool]:
    k_eff = max(1, min(k, len(labels), len(probs)))
    idxs = np.argsort(-probs)[:k_eff]
    candidates: list[TopSpecies] = []
    for i in idxs:
        species_id = labels[i]
        meta = taxonomy.get(species_id, {})
        en_common = meta.get("com_name_en") or species_id
        zh_raw = (meta.get("com_name_zh") or "").strip()
        zh_common = zh_raw if zh_raw else en_common
        scientific = meta.get("sci_name") or en_common
        zh_wiki = (meta.get("zh_wiki_url") or "").strip() or None
        en_wiki = (meta.get("en_wiki_url") or "").strip() or None
        candidates.append(
            TopSpecies(
                species_id=species_id,
                name=ZhAndEn(zh=zh_common, en=en_common),
                scientific_name=scientific,
                wiki_url_zh=zh_wiki,
                wiki_url_en=en_wiki,
                probability=float(probs[i]),
            )
        )

    qualified = [s for s in candidates if s.probability >= threshold]
    reference = [s for s in candidates if s.probability < threshold]
    return qualified, reference, bool(qualified)


def _build_top_classes(
    probs: np.ndarray,
    labels: list[str],
    taxonomy: dict[str, dict[str, str]],
    k: int,
    *,
    threshold: float,
) -> list[TopClass]:
    k_eff = max(1, min(k, len(labels), len(probs)))
    idxs = np.argsort(-probs)[:k_eff]
    class_counts: dict[str, int] = {}
    for i in idxs:
        if float(probs[i]) < threshold:
            continue
        species_id = labels[i]
        meta = taxonomy.get(species_id)
        if not meta:
            continue
        class_counts[meta["class"]] = class_counts.get(meta["class"], 0) + 1

    ranked = sorted(class_counts.items(), key=lambda item: -item[1])[:k_eff]
    return [
        TopClass(
            class_name=ZhAndEn(zh=cls, en=cls),
            probability=count / max(len(ranked), 1),
        )
        for cls, count in ranked
    ]


def _build_decision_support(
    top_species: list[TopSpecies],
    *,
    threshold: float,
    meets_threshold: bool,
) -> DecisionSupport:
    threshold_pct = int(round(threshold * 100))

    if not meets_threshold or not top_species:
        return DecisionSupport(
            risk_analysis=ZhAndEn(
                zh=(
                    f"最高信心分數未達 {threshold_pct}% 門檻，"
                    "本片段無可靠物種辨識結果。"
                ),
                en=(
                    f"Top confidence did not reach the {threshold_pct}% threshold; "
                    "no reliable species identification for this segment."
                ),
            ),
            action_recommendation=ZhAndEn(
                zh=(
                    "建議在較安靜環境重新錄製、延長含鳥鳴的片段，"
                    "或改用其他時段音訊後再試。"
                ),
                en=(
                    "Try re-recording in a quieter setting, use a longer segment "
                    "with bird calls, or upload audio from another time window."
                ),
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
                f"信心水準達 {pct}%（門檻 {threshold_pct}%），預測結果為 {name_zh}。"
                f"此 5 秒片段的聲學特徵與模型訓練物種分布一致。"
            ),
            en=(
                f"Confidence reached {pct}% (threshold {threshold_pct}%) for {name_en}. "
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
    confidence_threshold: float,
    spectrogram: SpectrogramPayload | None = None,
    model_name: str | None = None,
) -> ChunkPrediction:
    top_species, reference_species, meets_threshold = _build_top_species(
        probs, labels, taxonomy, top_k, threshold=confidence_threshold
    )
    top_classes = _build_top_classes(
        probs, labels, taxonomy, top_k, threshold=confidence_threshold
    )
    predictions = Prediction(
        top_species=top_species,
        top_classes=top_classes,
        attention_weights=_format_attention_weights(attention_row),
        meets_confidence_threshold=meets_threshold,
        reference_species=reference_species,
    )
    return ChunkPrediction(
        index=chunk_index,
        analysis_id=_make_analysis_id(chunk_index, model_name),
        predictions=predictions,
        decision_support=_build_decision_support(
            top_species,
            threshold=confidence_threshold,
            meets_threshold=meets_threshold,
        ),
        spectrogram=spectrogram,
        error=None,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    app.state.predictors = {}
    app.state.taxonomy = None
    app.state.taxonomy_by_model = None
    app.state.model_status = ModelStatus.IDLE
    app.state.load_error = None
    app.state.model_load_lock = asyncio.Lock()
    app.state.prediction_sem = asyncio.Semaphore(settings.max_concurrent_predictions)
    app.state.warmup_task = None

    if settings.eager_warmup:
        logger.info("Scheduling background model warmup (eager_warmup=true)")
        app.state.warmup_task = schedule_warmup(app)
    else:
        logger.info("Model warmup deferred until /api/warmup or /api/predict")

    yield

    task = app.state.warmup_task
    if task is not None and not task.done():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


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
    """Liveness + readiness hint for load balancers and demo preheat scripts."""

    ok: bool
    ready: bool
    status: str
    num_classes: int | None = None
    confidence_threshold: float | None = None
    error: str | None = None


@app.get("/")
async def root() -> dict:
    return {
        "service": "EchoWing Bird Acoustic API",
        "docs": "/docs",
        "health": "/api/health",
        "ready": "/api/ready",
        "warmup": "/api/warmup",
        "predict": "/api/predict",
    }


@app.get("/api/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    return HealthResponse(**status_payload(request.app))


@app.get("/api/ready", response_model=HealthResponse)
async def ready(request: Request) -> HealthResponse:
    payload = status_payload(request.app)
    if not payload["ready"]:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Models are not loaded yet. Call GET /api/warmup and retry.",
                **payload,
            },
        )
    return HealthResponse(**payload)


@app.get("/api/warmup", response_model=HealthResponse)
@app.post("/api/warmup", response_model=HealthResponse)
async def warmup(request: Request) -> HealthResponse:
    """Idempotent preheat: starts background model load if idle."""
    state = request.app.state
    if state.model_status == ModelStatus.IDLE:
        state.warmup_task = schedule_warmup(request.app)
    return HealthResponse(**status_payload(request.app))


from app.audio_mel import load_waveform_full

def _process_audio(
    settings: Settings,
    predictors: dict,
    taxonomy: dict[str, dict[str, str]],
    blobs: list[tuple[int, bytes, str | None]],
    *,
    original_filename: str,
    claimed_sample_rate: int,
    warnings: list[str],
    model_selection: str,
    taxonomy_by_model: dict[str, dict[str, dict[str, str]]] | None,
) -> PredictResponse:
    # 1. Stitch all uploaded blobs into a single continuous waveform
    by_index = sorted(blobs, key=lambda x: x[0])
    waveforms = []
    
    # We will just load the first file to get device (CPU)
    device = torch.device("cpu")
    
    for idx, raw, _fn in by_index:
        try:
            w = load_waveform_full(
                raw, settings, device, filename=original_filename or _fn
            )
            waveforms.append(w)  # shape (1, S)
        except Exception as exc:
            logger.warning("chunk %s decode failed: %s", idx, exc)

    if not waveforms:
        return PredictResponse(chunks=[], original_filename=original_filename, warnings=warnings)
        
    full_waveform = torch.cat(waveforms, dim=1)  # (1, Total_S)
    total_samples = full_waveform.shape[1]
    
    model_name = _resolve_model(model_selection, predictors)
    predictor = predictors.get(model_name)
    if not predictor:
        return PredictResponse(chunks=[], original_filename=original_filename, warnings=warnings)

    labels = predictor.labels
    chunk_sec = 3 if model_name == "birdnet" else 5
    chunk_samples = chunk_sec * settings.sample_rate

    chunks_out: list[ChunkPrediction] = []

    for start in range(0, total_samples, chunk_samples):
        end = start + chunk_samples
        chunk_wave = full_waveform[:, start:end]

        if chunk_wave.shape[1] < chunk_samples:
            chunk_wave = torch.nn.functional.pad(chunk_wave, (0, chunk_samples - chunk_wave.shape[1]))

        batch_wave = chunk_wave.unsqueeze(0)

        probs_all, attn_all = predictor.predict_waveform_batch(batch_wave)
        probs = probs_all[0]

        if getattr(predictor, "uses_baseline", False) and hasattr(predictor, "baseline"):
            probs = np.clip(probs - predictor.baseline, 0.0, 1.0)

        xai_heatmap = None
        meets_threshold = bool(np.max(probs) >= settings.confidence_threshold)

        if meets_threshold and settings.enable_xai:
            target_idx = int(np.argmax(probs))
            xai_heatmap = generate_occlusion_heatmap(
                chunk_wave,
                predictor,
                target_idx,
                sample_rate=settings.sample_rate,
                window_sec=settings.xai_window_sec,
            )

        spectrogram = compute_spectrogram_payload(chunk_wave, settings, device)

        model_taxonomy = _taxonomy_for_model(model_name, taxonomy_by_model, taxonomy)
        start_sec = start // settings.sample_rate
        cp = _chunk_from_probs(
            chunk_index=start_sec,
            probs=probs,
            labels=labels,
            taxonomy=model_taxonomy,
            top_k=settings.response_top_k,
            attention_row=attn_all[0] if attn_all is not None else None,
            confidence_threshold=settings.confidence_threshold,
            spectrogram=spectrogram,
            model_name=model_name,
        )
        cp.model_name = model_name
        if cp.predictions:
            cp.predictions.xai_heatmap = xai_heatmap
        chunks_out.append(cp)

    if claimed_sample_rate != settings.sample_rate:
        warnings.append(f"sample_rate was {claimed_sample_rate}, server uses {settings.sample_rate}")

    return PredictResponse(
        chunks=chunks_out,
        original_filename=original_filename,
        warnings=warnings,
        confidence_threshold=settings.confidence_threshold,
    )

import json

async def _stream_process_audio(
    settings: Settings,
    predictors: dict,
    taxonomy: dict[str, dict[str, str]],
    blobs: list[tuple[int, bytes, str | None]],
    *,
    original_filename: str,
    claimed_sample_rate: int,
    model_selection: str,
    taxonomy_by_model: dict[str, dict[str, dict[str, str]]] | None,
):
    by_index = sorted(blobs, key=lambda x: x[0])
    waveforms = []
    device = torch.device("cpu")
    
    for idx, raw, _fn in by_index:
        try:
            w = await run_in_threadpool(
                load_waveform_full,
                raw,
                settings,
                device,
                filename=original_filename or _fn,
            )
            waveforms.append(w)  # shape (1, S)
        except Exception as exc:
            logger.warning("chunk decode failed: %s", exc)
            err_msg = str(exc).strip() or "Audio decode failed"
            yield f"data: {json.dumps({'error': err_msg}, ensure_ascii=False)}\n\n"
            return

    if not waveforms:
        yield f"data: {json.dumps({'error': 'No audio data decoded'}, ensure_ascii=False)}\n\n"
        return
        
    full_waveform = torch.cat(waveforms, dim=1)  # (1, Total_S)
    total_samples = full_waveform.shape[1]
    
    model_name = _resolve_model(model_selection, predictors)
    predictor = predictors.get(model_name)
    if not predictor:
        yield f"data: {json.dumps({'error': f'Model not available: {model_name}'})}\n\n"
        return

    chunk_sec = 3 if model_name == "birdnet" else 5
    stride_samples = chunk_sec * settings.sample_rate

    init_event = {
        "event": "init",
        "original_filename": original_filename,
        "sample_rate": settings.sample_rate,
        "model": model_name,
        "window_sec": chunk_sec,
        "stride_sec": chunk_sec,
        "total_duration_sec": total_samples / settings.sample_rate,
        "confidence_threshold": settings.confidence_threshold,
        "xai_pending": settings.enable_xai,
    }
    yield f"data: {json.dumps(init_event)}\n\n"
    await asyncio.sleep(0)

    chunk_samples = chunk_sec * settings.sample_rate
    model_taxonomy = _taxonomy_for_model(model_name, taxonomy_by_model, taxonomy)
    xai_jobs: list[dict] = []

    # Phase 1: inference + spectrogram per window (no XAI yet)
    for start in range(0, total_samples, stride_samples):
        end = start + chunk_samples
        chunk_wave = full_waveform[:, start:end]

        if chunk_wave.shape[1] < chunk_samples:
            chunk_wave = torch.nn.functional.pad(chunk_wave, (0, chunk_samples - chunk_wave.shape[1]))

        batch_wave = chunk_wave.unsqueeze(0)

        def run_predict_only():
            probs_all, attn_all = predictor.predict_waveform_batch(batch_wave)
            probs = probs_all[0]
            if getattr(predictor, "uses_baseline", False) and hasattr(predictor, "baseline"):
                probs = np.clip(probs - predictor.baseline, 0.0, 1.0)
            spectrogram = compute_spectrogram_payload(chunk_wave, settings, device)
            return probs, attn_all, spectrogram

        probs, attn_all, spectrogram = await run_in_threadpool(run_predict_only)

        start_sec = start // settings.sample_rate
        cp = _chunk_from_probs(
            chunk_index=start_sec,
            probs=probs,
            labels=predictor.labels,
            taxonomy=model_taxonomy,
            top_k=settings.response_top_k,
            attention_row=attn_all[0] if attn_all is not None else None,
            confidence_threshold=settings.confidence_threshold,
            spectrogram=spectrogram,
            model_name=model_name,
        )
        cp.model_name = model_name
        if cp.predictions:
            cp.predictions.xai_heatmap = None

        yield f"data: {cp.model_dump_json()}\n\n"
        await asyncio.sleep(0.01)

        meets_threshold = bool(np.max(probs) >= settings.confidence_threshold)
        if meets_threshold and settings.enable_xai:
            xai_jobs.append(
                {
                    "chunk_wave": chunk_wave,
                    "target_idx": int(np.argmax(probs)),
                    "index": start_sec,
                    "analysis_id": cp.analysis_id,
                }
            )

    # Phase 2: XAI per window, then patch heatmaps via xai_update events
    if settings.enable_xai:
        for job in xai_jobs:
            cw = job["chunk_wave"]
            target_idx = job["target_idx"]

            def run_xai():
                return generate_occlusion_heatmap(
                    cw,
                    predictor,
                    target_idx,
                    sample_rate=settings.sample_rate,
                    window_sec=settings.xai_window_sec,
                )

            xai_heatmap = await run_in_threadpool(run_xai)
            update_event = {
                "event": "xai_update",
                "index": job["index"],
                "model_name": model_name,
                "analysis_id": job["analysis_id"],
                "xai_heatmap": xai_heatmap,
            }
            yield f"data: {json.dumps(update_event)}\n\n"
            await asyncio.sleep(0.01)

        yield f"data: {json.dumps({'event': 'xai_done'})}\n\n"


@app.post("/api/predict", response_model=PredictResponse)
async def predict(
    request: Request,
    audio_chunks: list[UploadFile] = File(...),
    original_filename: str = Form(""),
    sample_rate: int = Form(32_000),
    model_selection: str = Form("perch"),
) -> PredictResponse:
    try:
        await ensure_models_loaded(request.app)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail={"message": str(exc), **status_payload(request.app)},
        ) from exc

    settings: Settings = request.app.state.settings
    predictors: dict = getattr(request.app.state, "predictors", {})
    taxonomy: dict[str, dict[str, str]] = request.app.state.taxonomy
    taxonomy_by_model = getattr(request.app.state, "taxonomy_by_model", None)
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
        raise HTTPException(status_code=422, detail={"message": "No audio_chunks uploaded"})

    if len(audio_chunks) > settings.max_chunks:
        raise HTTPException(status_code=422, detail={"message": f"Too many chunks (max {settings.max_chunks})"})

    indexed = list(enumerate(audio_chunks))
    indexed.sort(key=lambda it: filename_sort_key(it[1].filename, it[0]))

    warnings: list[str] = []
    
    blobs: list[tuple[int, bytes, str | None]] = []
    for upload_order, uf in indexed:
        name = uf.filename or ""
        m = CHUNK_FILENAME_RE.search(name)
        chunk_idx = int(m.group(1)) if m else upload_order
        data = await uf.read()
        if not data:
            continue
        blobs.append((chunk_idx, data, name))

    try:
        async with sem:
            return await run_in_threadpool(
                _process_audio,
                settings,
                predictors,
                taxonomy,
                blobs,
                original_filename=original_filename,
                claimed_sample_rate=sample_rate,
                warnings=warnings,
                model_selection=model_selection,
                taxonomy_by_model=taxonomy_by_model,
            )
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"message": str(e)}) from e

@app.post("/api/stream-predict")
async def stream_predict(
    request: Request,
    audio_chunks: list[UploadFile] = File(...),
    original_filename: str = Form(""),
    sample_rate: int = Form(32_000),
    model_selection: str = Form("perch"),
):
    try:
        await ensure_models_loaded(request.app)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail={"message": str(exc), **status_payload(request.app)},
        ) from exc

    settings: Settings = request.app.state.settings
    predictors: dict = getattr(request.app.state, "predictors", {})
    taxonomy: dict[str, dict[str, str]] = request.app.state.taxonomy
    taxonomy_by_model = getattr(request.app.state, "taxonomy_by_model", None)
    sem: asyncio.Semaphore = request.app.state.prediction_sem

    if not audio_chunks:
        raise HTTPException(status_code=422, detail={"message": "No audio_chunks uploaded"})

    indexed = list(enumerate(audio_chunks))
    indexed.sort(key=lambda it: filename_sort_key(it[1].filename, it[0]))

    blobs: list[tuple[int, bytes, str | None]] = []
    for upload_order, uf in indexed:
        name = uf.filename or ""
        m = CHUNK_FILENAME_RE.search(name)
        chunk_idx = int(m.group(1)) if m else upload_order
        data = await uf.read()
        if not data:
            continue
        blobs.append((chunk_idx, data, name))

    async def event_generator():
        async with sem:
            async for chunk in _stream_process_audio(
                settings,
                predictors,
                taxonomy,
                blobs,
                original_filename=original_filename,
                claimed_sample_rate=sample_rate,
                model_selection=model_selection,
                taxonomy_by_model=taxonomy_by_model,
            ):
                yield chunk
            yield "data: {\"event\": \"done\"}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
