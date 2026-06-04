from __future__ import annotations

import logging
import numpy as np
import torch
import pandas as pd

from app.config import Settings, chunk_samples

logger = logging.getLogger(__name__)

def _import_tensorflow():
    import tensorflow as tf
    return tf

EMBED_DIM = 1536

class PerchChunkPredictor:
    """Perch v2 SavedModel using native global logits + embedding."""

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
        self._logits_key = "logits"

        # Load global taxonomy labels for Perch
        if not settings.perch_taxonomy_csv_path.is_file():
            # Fallback to generating dummy labels if not provided yet, but in reality we'd download it.
            logger.warning(f"Perch taxonomy {settings.perch_taxonomy_csv_path} not found. Generating dummy.")
            self.labels = [f"Species_{i}" for i in range(10932)]
        else:
            df = pd.read_csv(settings.perch_taxonomy_csv_path)
            self.labels = df["primary_label"].astype(str).tolist()

        self.baseline = np.zeros(len(self.labels), dtype=np.float32)

    def _infer_batch(self, waveforms: np.ndarray) -> np.ndarray:
        """waveforms: (N, samples) float32 -> (N, num_classes) float32."""
        n = waveforms.shape[0]
        if waveforms.shape[1] != self._chunk_samples:
            raise ValueError(
                f"expected {self._chunk_samples} samples per chunk, got {waveforms.shape[1]}"
            )

        logits_parts: list[np.ndarray] = []
        for start in range(0, n, self._embed_batch_size):
            batch = waveforms[start : start + self._embed_batch_size]
            outputs = self._embed_fn(inputs=self._tf.constant(batch, dtype=self._tf.float32))
            
            if self._logits_key in outputs:
                logits = np.asarray(outputs[self._logits_key], dtype=np.float32)
            else:
                # If the model only outputs embeddings, we're in trouble without the dense layer.
                # Assuming standard Kaggle model structure:
                raise ValueError("Model does not output logits directly.")
                
            logits_parts.append(logits)

        all_logits = np.concatenate(logits_parts, axis=0)
        
        # Apply sigmoid to logits
        probs = 1.0 / (1.0 + np.exp(-all_logits))
        return np.clip(np.nan_to_num(probs, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0).astype(np.float32, copy=False)

    def predict_waveform_batch(
        self, chunks: torch.Tensor
    ) -> tuple[np.ndarray, np.ndarray | None]:
        if chunks.ndim != 3 or chunks.shape[1] != 1:
            raise ValueError(f"expected chunks shape (N, 1, S), got {tuple(chunks.shape)}")

        waveforms = chunks.squeeze(1).detach().cpu().numpy().astype(np.float32, copy=False)
        probs = self._infer_batch(waveforms)
        return probs, None


