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
        analysis_id=_make_analysis_id(chunk_index),
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
) -> PredictResponse:
    # 1. Stitch all uploaded blobs into a single continuous waveform
    by_index = sorted(blobs, key=lambda x: x[0])
    waveforms = []
    
    # We will just load the first file to get device (CPU)
    device = torch.device("cpu")
    
    for idx, raw, _fn in by_index:
        try:
            w = load_waveform_full(raw, settings, device, format_hint="wav")
            waveforms.append(w.squeeze(0)) # shape (1, S)
        except Exception as exc:
            logger.warning("chunk %s decode failed: %s", idx, exc)

    if not waveforms:
        return PredictResponse(chunks=[], original_filename=original_filename, warnings=warnings)
        
    full_waveform = torch.cat(waveforms, dim=1) # (1, Total_S)
    total_samples = full_waveform.shape[1]
    
    # Determine which models to run
    models_to_run = []
    if model_selection == "ensemble":
        models_to_run = list(predictors.keys())
    elif model_selection in predictors:
        models_to_run = [model_selection]
    else:
        models_to_run = ["perch"]
        
    chunks_out: list[ChunkPrediction] = []
    chunk_index_counter = 0
    
    for model_name in models_to_run:
        predictor = predictors.get(model_name)
        if not predictor:
            continue
            
        labels = predictor.labels
        
        # Determine chunk size (default 5s for perch, 3s for birdnet)
        chunk_sec = 3 if model_name == "birdnet" else 5
        chunk_samples = chunk_sec * settings.sample_rate
        
        # Slice full waveform into chunks
        for start in range(0, total_samples, chunk_samples):
            end = start + chunk_samples
            chunk_wave = full_waveform[:, start:end]
            
            # Pad if too short
            if chunk_wave.shape[1] < chunk_samples:
                chunk_wave = torch.nn.functional.pad(chunk_wave, (0, chunk_samples - chunk_wave.shape[1]))
                
            batch_wave = chunk_wave.unsqueeze(0) # (1, 1, S)
            
            probs_all, attn_all = predictor.predict_waveform_batch(batch_wave)
            probs = probs_all[0]
            
            if getattr(predictor, "uses_baseline", False) and hasattr(predictor, "baseline"):
                probs = np.clip(probs - predictor.baseline, 0.0, 1.0)
            
            # Calculate XAI if enabled and confidence is high enough
            xai_heatmap = None
            meets_threshold = bool(np.max(probs) >= settings.confidence_threshold)
            
            if meets_threshold and settings.enable_xai:
                target_idx = int(np.argmax(probs))
                xai_heatmap = generate_occlusion_heatmap(
                    chunk_wave, predictor, target_idx, 
                    sample_rate=settings.sample_rate, 
                    window_sec=settings.xai_window_sec
                )
                
            spectrogram = compute_spectrogram_payload(chunk_wave, settings, device)
            
            cp = _chunk_from_probs(
                chunk_index=chunk_index_counter,
                probs=probs,
                labels=labels,
                taxonomy=taxonomy,
                top_k=settings.response_top_k,
                attention_row=attn_all[0] if attn_all is not None else None,
                confidence_threshold=settings.confidence_threshold,
                spectrogram=spectrogram,
            )
            cp.model_name = model_name
            if cp.predictions:
                cp.predictions.xai_heatmap = xai_heatmap
            chunks_out.append(cp)
            chunk_index_counter += 1

    if claimed_sample_rate != settings.sample_rate:
        warnings.append(f"sample_rate was {claimed_sample_rate}, server uses {settings.sample_rate}")

    return PredictResponse(
        chunks=chunks_out,
        original_filename=original_filename,
        warnings=warnings,
        confidence_threshold=settings.confidence_threshold,
    )


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
            )
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"message": str(e)}) from e
