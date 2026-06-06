from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import torch

from app.config import Settings, chunk_samples
from app.tensorflow_threads import (
    configure_tensorflow_threads,
    recommended_tf_intra_op_threads,
)

logger = logging.getLogger(__name__)

EMBED_DIM = 1536
_SCORE_OUTPUT_KEYS = ("logits", "label")


def _import_tensorflow():
    import tensorflow as tf

    return tf


def _load_perch_labels(labels_path: Path) -> list[str]:
    """Load Perch v2 class list from SavedModel assets/labels.csv (one scientific name per line)."""
    if not labels_path.is_file():
        raise FileNotFoundError(f"Perch labels file not found: {labels_path}")

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


class PerchChunkPredictor:
    """Perch v2 SavedModel: global species scores + embedding."""

    uses_baseline = False

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.device = torch.device("cpu")
        savedmodel_path = settings.perch_savedmodel_path
        if not savedmodel_path.is_dir():
            raise FileNotFoundError(f"Perch SavedModel directory not found: {savedmodel_path}")

        labels_path = settings.perch_labels_path
        if not labels_path.is_file():
            labels_path = savedmodel_path / "assets" / "labels.csv"
        self.labels = _load_perch_labels(labels_path)
        logger.info("Loaded %s Perch labels from %s", len(self.labels), labels_path)

        self._chunk_samples = chunk_samples(settings)
        self._embed_batch_size = max(1, settings.batch_size)

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

        self.baseline = np.zeros(len(self.labels), dtype=np.float32)

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

    def _infer_batch(self, waveforms: np.ndarray) -> np.ndarray:
        """waveforms: (N, samples) float32 -> (N, num_classes) float32."""
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

        all_scores = np.concatenate(score_parts, axis=0)
        return _scores_to_probs(all_scores)

    def predict_waveform_batch(
        self, chunks: torch.Tensor
    ) -> tuple[np.ndarray, np.ndarray | None]:
        if chunks.ndim != 3 or chunks.shape[1] != 1:
            raise ValueError(f"expected chunks shape (N, 1, S), got {tuple(chunks.shape)}")

        waveforms = chunks.squeeze(1).detach().cpu().numpy().astype(np.float32, copy=False)
        probs = self._infer_batch(waveforms)
        return probs, None
