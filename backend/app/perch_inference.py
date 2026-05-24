from __future__ import annotations

import logging

import numpy as np
import torch

from app.config import Settings, chunk_samples
from app.perch_stage2 import load_stage2_checkpoint

logger = logging.getLogger(__name__)


def _import_tensorflow():
    import tensorflow as tf

    return tf

EMBED_DIM = 1536


class PerchChunkPredictor:
    """Perch v2 SavedModel embeddings + pseudo_best_model.pt stage-2 classifier."""

    uses_baseline = False

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.device = torch.device("cpu")
        savedmodel_path = settings.perch_savedmodel_path
        if not savedmodel_path.is_dir():
            raise FileNotFoundError(f"Perch SavedModel directory not found: {savedmodel_path}")

        self._chunk_samples = chunk_samples(settings)
        self._embed_batch_size = max(1, settings.batch_size)

        tf = _import_tensorflow()
        self._tf = tf

        logger.info("Loading Perch SavedModel from %s", savedmodel_path)
        saved = tf.saved_model.load(str(savedmodel_path))
        self._embed_fn = saved.signatures["serving_default"]
        self._input_key = "inputs"
        self._output_key = "embedding"
        _validate_embed_signature(self._embed_fn, self._chunk_samples)

        self._stage2, self._feat_mean, self._feat_std, self.labels = load_stage2_checkpoint(
            settings.pseudo_head_path, self.device
        )
        self.baseline = np.zeros(len(self.labels), dtype=np.float32)
        self._preflight()

    def _preflight(self) -> None:
        dummy = np.zeros((1, self._chunk_samples), dtype=np.float32)
        emb = self._embed_waveforms(dummy)
        probs = self._classify_embeddings(emb)
        if probs.shape != (1, len(self.labels)):
            raise ValueError(
                f"stage-2 output shape {probs.shape} != (1, {len(self.labels)})"
            )

    def _embed_waveforms(self, waveforms: np.ndarray) -> np.ndarray:
        """waveforms: (N, samples) float32 -> (N, 1536) float32."""
        n = waveforms.shape[0]
        if waveforms.shape[1] != self._chunk_samples:
            raise ValueError(
                f"expected {self._chunk_samples} samples per chunk, got {waveforms.shape[1]}"
            )

        parts: list[np.ndarray] = []
        for start in range(0, n, self._embed_batch_size):
            batch = waveforms[start : start + self._embed_batch_size]
            outputs = self._embed_fn(inputs=self._tf.constant(batch, dtype=self._tf.float32))
            emb = np.asarray(outputs[self._output_key], dtype=np.float32)
            if emb.ndim != 2 or emb.shape[1] != EMBED_DIM:
                raise ValueError(f"unexpected embedding shape: {emb.shape}")
            parts.append(emb)

        return np.concatenate(parts, axis=0).astype(np.float32, copy=False)

    def _classify_embeddings(self, embeddings: np.ndarray) -> np.ndarray:
        x = (embeddings - self._feat_mean) / (self._feat_std + 1e-6)
        xt = torch.from_numpy(x.astype(np.float32, copy=False))
        with torch.no_grad():
            logits = self._stage2(xt)
            probs = torch.sigmoid(logits).numpy()
        return np.clip(
            np.nan_to_num(probs, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0
        ).astype(np.float32, copy=False)

    def predict_waveform_batch(
        self, chunks: torch.Tensor
    ) -> tuple[np.ndarray, np.ndarray | None]:
        """
        chunks: (N, 1, CHUNK_SAMPLES) float32
        Returns (species_probs, None) — Perch path has no attention head.
        """
        if chunks.ndim != 3 or chunks.shape[1] != 1:
            raise ValueError(f"expected chunks shape (N, 1, S), got {tuple(chunks.shape)}")

        waveforms = chunks.squeeze(1).detach().cpu().numpy().astype(np.float32, copy=False)
        embeddings = self._embed_waveforms(waveforms)
        probs = self._classify_embeddings(embeddings)
        return probs, None


def _validate_embed_signature(fn: object, expected_samples: int) -> None:
    sig = getattr(fn, "structured_input_signature", None)
    if not sig or len(sig) < 2:
        raise ValueError("Perch serving_default signature has no inputs")
    inputs = sig[1]
    if "inputs" not in inputs:
        raise ValueError(f"Perch model missing 'inputs' key, got: {list(inputs.keys())}")
    spec = inputs["inputs"]
    shape = spec.shape.as_list() if hasattr(spec.shape, "as_list") else list(spec.shape)
    if len(shape) != 2 or shape[1] not in (expected_samples, None):
        raise ValueError(
            f"Perch inputs shape {shape} incompatible with chunk_samples={expected_samples}"
        )
