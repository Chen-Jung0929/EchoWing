from __future__ import annotations

import logging
import threading
from pathlib import Path

import numpy as np
import torch

from app.config import Settings, chunk_samples
from app.model_assets import resolve_perch_labels_path, validate_labels_file, validate_tflite_file
from app.tensorflow_threads import (
    configure_tensorflow_threads,
    recommended_tf_intra_op_threads,
)

logger = logging.getLogger(__name__)

EMBED_DIM = 1536
_SCORE_OUTPUT_KEYS = ("logits", "label")
_PERCH_CHUNK_SAMPLES = 160_000  # 32 kHz × 5 s


def _import_tensorflow():
    import tensorflow as tf

    return tf


def _import_tflite():
    try:
        import tflite_runtime.interpreter as tflite
        return tflite
    except ImportError:
        import tensorflow as tf
        return tf.lite


def _load_perch_labels(labels_path: Path) -> list[str]:
    """Load Perch v2 class list (one scientific name per line)."""
    validate_labels_file(labels_path, min_lines=1000)

    lines = [
        line.strip()
        for line in labels_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    # First line is dataset tag (e.g. inat2024_fsd50k), not a species.
    if lines and not lines[0].count(" "):
        first = lines[0].lower()
        if first.startswith("inat") or first in ("no_ebird_code", "ebird2021"):
            lines = lines[1:]
        elif "_" not in lines[0] and lines[0].isascii() and lines[0].islower():
            lines = lines[1:]

    if not lines:
        raise ValueError(f"No species labels found in {labels_path}")
    return lines


def _scores_to_probs(scores: np.ndarray) -> np.ndarray:
    scores = np.asarray(scores, dtype=np.float32)
    if scores.min() < 0.0 or scores.max() > 1.0:
        scores = 1.0 / (1.0 + np.exp(-scores))
    return np.clip(np.nan_to_num(scores, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0).astype(
        np.float32, copy=False
    )


class _PerchTfBackend:
    """Original Perch v2 TensorFlow SavedModel backend."""

    name = "tf"

    def __init__(self, settings: Settings, labels: list[str]) -> None:
        self.settings = settings
        self.labels = labels
        self._chunk_samples = chunk_samples(settings)
        self._embed_batch_size = max(1, settings.batch_size)

        savedmodel_path = settings.perch_savedmodel_path
        if not savedmodel_path.is_dir():
            raise FileNotFoundError(f"Perch SavedModel directory not found: {savedmodel_path}")

        tf = _import_tensorflow()
        configure_tensorflow_threads(
            settings,
            intra_op=recommended_tf_intra_op_threads(settings),
        )
        self._tf = tf

        logger.info("Loading Perch SavedModel from %s", savedmodel_path)
        saved = tf.saved_model.load(str(savedmodel_path))
        self._embed_fn = saved.signatures["serving_default"]
        self._score_key = self._resolve_score_output_key()

    def _resolve_score_output_key(self) -> str:
        probe = self._tf.constant(
            np.zeros((1, self._chunk_samples), dtype=np.float32)
        )
        outputs = self._embed_fn(inputs=probe)
        for key in _SCORE_OUTPUT_KEYS:
            if key in outputs:
                out = np.asarray(outputs[key], dtype=np.float32)
                if out.ndim == 2:
                    out = out[0]
                if len(out) != len(self.labels):
                    logger.warning(
                        "Perch output '%s' length %s != labels.csv length %s",
                        key,
                        len(out),
                        len(self.labels),
                    )
                logger.info("Perch SavedModel score output: '%s' (%s classes)", key, len(out))
                return key
        raise ValueError(
            f"Perch SavedModel has no score output; expected one of {_SCORE_OUTPUT_KEYS}, "
            f"got {list(outputs.keys())}"
        )

    def infer_batch(self, waveforms: np.ndarray) -> np.ndarray:
        n = waveforms.shape[0]
        if waveforms.shape[1] != self._chunk_samples:
            raise ValueError(
                f"expected {self._chunk_samples} samples per chunk, got {waveforms.shape[1]}"
            )

        score_parts: list[np.ndarray] = []
        for start in range(0, n, self._embed_batch_size):
            batch = waveforms[start : start + self._embed_batch_size]
            outputs = self._embed_fn(inputs=self._tf.constant(batch, dtype=self._tf.float32))
            raw = np.asarray(outputs[self._score_key], dtype=np.float32)
            if raw.ndim == 1:
                raw = raw[np.newaxis, :]
            score_parts.append(raw)

        return _scores_to_probs(np.concatenate(score_parts, axis=0))


class _PerchTfliteBackend:
    """Perch v2 CPU TFLite backend (FP32 or dynamic INT8)."""

    name = "tflite"

    def __init__(self, settings: Settings, labels: list[str], model_path: Path) -> None:
        if not model_path.is_file():
            raise FileNotFoundError(f"Perch TFLite model not found: {model_path}")
        validate_tflite_file(model_path, label="Perch TFLite model")

        self.settings = settings
        self.labels = labels
        self.model_path = model_path
        self._chunk_samples = _PERCH_CHUNK_SAMPLES
        self._embed_batch_size = max(1, settings.batch_size)

        tflite = _import_tflite()
        logger.info(
            "Loading Perch TFLite from %s (num_threads=%s)",
            model_path,
            settings.num_threads,
        )
        self.interpreter = tflite.Interpreter(
            model_path=str(model_path),
            num_threads=max(1, settings.num_threads),
        )
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()
        self._output_index = self._resolve_label_output_index()
        self._input_shape = tuple(self.input_details[0]["shape"])
        self._invoke_lock = threading.Lock()

    def _resolve_label_output_index(self) -> int:
        for detail in self.output_details:
            name = str(detail.get("name", "")).lower()
            shape = tuple(int(x) for x in detail["shape"])
            if "label" in name or (len(shape) >= 2 and shape[-1] == len(self.labels)):
                logger.info(
                    "Perch TFLite score output: '%s' shape=%s",
                    detail.get("name"),
                    detail["shape"],
                )
                return int(detail["index"])
        # Fallback: first output with class dimension matching labels (or largest 2D output).
        best_idx = int(self.output_details[0]["index"])
        best_classes = -1
        for detail in self.output_details:
            shape = tuple(int(x) for x in detail["shape"])
            if len(shape) >= 2:
                classes = shape[-1]
                if classes == len(self.labels):
                    return int(detail["index"])
                if classes > best_classes:
                    best_classes = classes
                    best_idx = int(detail["index"])
        logger.warning(
            "Perch TFLite: using output index %s (no exact label match for %s classes)",
            best_idx,
            len(self.labels),
        )
        return best_idx

    def _run_one(self, wave: np.ndarray) -> np.ndarray:
        if len(wave) < self._chunk_samples:
            wave = np.pad(wave, (0, self._chunk_samples - len(wave)))
        elif len(wave) > self._chunk_samples:
            wave = wave[: self._chunk_samples]

        input_shape = self._input_shape
        if input_shape[0] in (-1, 0, None):
            tensor = wave.reshape(1, self._chunk_samples).astype(np.float32, copy=True)
        else:
            batch = int(input_shape[0])
            if batch == 1:
                tensor = wave.reshape(1, self._chunk_samples).astype(np.float32, copy=True)
            else:
                raise ValueError(f"Unsupported Perch TFLite batch size: {batch}")

        self.interpreter.set_tensor(self.input_details[0]["index"], tensor)
        self.interpreter.invoke()
        raw = np.copy(self.interpreter.get_tensor(self._output_index))
        if raw.ndim == 2:
            raw = raw[0]
        return _scores_to_probs(raw)

    def infer_batch(self, waveforms: np.ndarray) -> np.ndarray:
        n = waveforms.shape[0]
        if waveforms.shape[1] != self._chunk_samples:
            raise ValueError(
                f"expected {self._chunk_samples} samples per chunk, got {waveforms.shape[1]}"
            )

        with self._invoke_lock:
            return np.stack([self._run_one(waveforms[i]) for i in range(n)], axis=0)


def _resolve_tflite_path(settings: Settings, runtime: str) -> Path:
    if runtime == "tflite_int8":
        return settings.perch_tflite_int8_path
    return settings.perch_tflite_path


def _create_perch_backend(
    settings: Settings,
    labels: list[str],
    *,
    runtime: str,
    allow_tf_fallback: bool = True,
):
    runtime = runtime.lower()

    if runtime in ("onnx", "onnx_int8"):
        if allow_tf_fallback:
            logger.warning(
                "Perch runtime '%s' has no valid artifact; falling back to TensorFlow SavedModel",
                runtime,
            )
            return _PerchTfBackend(settings, labels)
        raise RuntimeError(f"Perch ONNX runtime '{runtime}' is not available")

    if runtime == "tf":
        return _PerchTfBackend(settings, labels)

    tflite_path = _resolve_tflite_path(settings, runtime)
    try:
        backend = _PerchTfliteBackend(settings, labels, tflite_path)
        if runtime == "tflite_int8":
            backend.name = "tflite_int8"
        return backend
    except Exception as exc:
        if not allow_tf_fallback:
            raise RuntimeError(
                f"Perch TFLite load failed ({tflite_path}): {exc}"
            ) from exc
        logger.warning(
            "Perch TFLite load failed (%s); falling back to TensorFlow SavedModel",
            exc,
        )
        return _PerchTfBackend(settings, labels)


class PerchChunkPredictor:
    """Perch v2: TensorFlow SavedModel or TFLite FP32 (selected via runtime=)."""

    uses_baseline = False

    def __init__(
        self,
        settings: Settings,
        *,
        runtime: str | None = None,
        allow_tf_fallback: bool = True,
    ) -> None:
        self.settings = settings
        self.device = torch.device("cpu")

        labels_path = resolve_perch_labels_path(
            settings.perch_labels_path,
            fallback_paths=(
                Path("models/perch/labels.csv"),
                settings.perch_savedmodel_path / "assets" / "labels.csv",
            ),
        )
        self.labels = _load_perch_labels(labels_path)
        logger.info("Loaded %s Perch labels from %s", len(self.labels), labels_path)

        self._chunk_samples = chunk_samples(settings)
        effective_runtime = (runtime or settings.perch_runtime).lower()
        self._backend = _create_perch_backend(
            settings,
            self.labels,
            runtime=effective_runtime,
            allow_tf_fallback=allow_tf_fallback,
        )
        self.runtime = self._backend.name
        logger.info("Perch inference runtime: %s", self.runtime)

        self.baseline = np.zeros(len(self.labels), dtype=np.float32)

    def predict_waveform_batch(
        self, chunks: torch.Tensor
    ) -> tuple[np.ndarray, np.ndarray | None]:
        if chunks.ndim != 3 or chunks.shape[1] != 1:
            raise ValueError(f"expected chunks shape (N, 1, S), got {tuple(chunks.shape)}")

        waveforms = chunks.squeeze(1).detach().cpu().numpy().astype(np.float32, copy=False)
        probs = self._backend.infer_batch(waveforms)
        return probs, None
