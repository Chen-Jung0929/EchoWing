"""Background model loading and warmup state for slow Perch startup (e.g. HF Spaces)."""

from __future__ import annotations

import asyncio
import logging
from enum import Enum

from starlette.concurrency import run_in_threadpool

from app.adjustion import load_silic_taxonomy_map, load_taxonomy_map
from app.audio_mel import configure_torch_threads
from app.config import Settings
from app.inference import (
    create_perch_fast_predictor,
    create_birdnet_predictor,
    create_silic_predictor,
    create_onnx_predictor
)

logger = logging.getLogger(__name__)


class ModelStatus(str, Enum):
    IDLE = "idle"
    LOADING = "loading"
    READY = "ready"
    ERROR = "error"


def _load_models_sync(settings: Settings):
    configure_torch_threads(settings.num_threads)
    
    predictors = {}
    try:
        predictors["perch-fast"] = create_perch_fast_predictor(settings)
    except Exception as e:
        logger.warning("Failed to load Perch-fast: %s", e)

    try:
        birdnet = create_birdnet_predictor(settings)
        if birdnet.is_ready:
            predictors["birdnet"] = birdnet
        else:
            logger.warning("BirdNET skipped: model file missing or invalid")
    except Exception as e:
        logger.warning("Failed to load BirdNET: %s", e)
        
    try:
        predictors["silic"] = create_silic_predictor(settings)
    except Exception as e:
        logger.warning(f"Failed to load SILIC: {e}")
        
    taxonomy = load_taxonomy_map(settings.taxonomy_csv_path)
    taxonomy_by_model: dict[str, dict[str, dict[str, str]]] = {
        "perch-fast": taxonomy,
        "birdnet": taxonomy,
    }
    if settings.silic_taxonomy_csv_path.is_file():
        taxonomy_by_model["silic"] = load_silic_taxonomy_map(settings.silic_taxonomy_csv_path)
    else:
        taxonomy_by_model["silic"] = {}
    return predictors, taxonomy, taxonomy_by_model


async def ensure_models_loaded(app) -> None:
    """Load predictor + taxonomy once; safe to call from multiple coroutines."""
    state = app.state

    if state.model_status == ModelStatus.READY:
        return

    if state.model_status == ModelStatus.ERROR:
        raise RuntimeError(state.load_error or "Model load failed")

    async with state.model_load_lock:
        if state.model_status == ModelStatus.READY:
            return

        if state.model_status == ModelStatus.ERROR:
            raise RuntimeError(state.load_error or "Model load failed")

        if state.model_status == ModelStatus.LOADING:
            while state.model_status == ModelStatus.LOADING:
                await asyncio.sleep(0.25)
            if state.model_status == ModelStatus.ERROR:
                raise RuntimeError(state.load_error or "Model load failed")
            return

        state.model_status = ModelStatus.LOADING
        state.load_error = None
        settings: Settings = state.settings

        try:
            logger.info("Loading inference models...")
            predictors, taxonomy, taxonomy_by_model = await run_in_threadpool(
                _load_models_sync, settings
            )
            state.predictors = predictors
            state.taxonomy = taxonomy
            state.taxonomy_by_model = taxonomy_by_model
            state.model_status = ModelStatus.READY
            logger.info("Models ready.")
        except Exception as exc:
            state.model_status = ModelStatus.ERROR
            state.load_error = str(exc)
            logger.exception("Model load failed")
            raise


def schedule_warmup(app) -> asyncio.Task:
    """Start background load; returns the asyncio Task."""
    return asyncio.create_task(ensure_models_loaded(app))


def status_payload(app) -> dict:
    state = app.state
    body: dict = {
        "ok": True,
        "ready": state.model_status == ModelStatus.READY,
        "status": state.model_status.value,
    }
    if state.model_status == ModelStatus.READY and hasattr(state, "predictors"):
        perch_fast = state.predictors.get("perch-fast")
        body["num_classes"] = len(perch_fast.labels) if perch_fast else 0
        body["perch_fast_runtime"] = getattr(perch_fast, "runtime", None) if perch_fast else None
        body["models_loaded"] = sorted(state.predictors.keys())
        body["confidence_threshold"] = state.settings.confidence_threshold
    if state.model_status == ModelStatus.ERROR and state.load_error:
        body["error"] = state.load_error
    active = int(getattr(state, "active_predictions", 0))
    max_concurrent = int(state.settings.max_concurrent_predictions)
    body["active_predictions"] = active
    body["max_concurrent_predictions"] = max_concurrent
    body["analysis_busy"] = active > 0
    body["analysis_slots_available"] = max(0, max_concurrent - active)
    return body
