from __future__ import annotations

import logging
import threading
from pathlib import Path

import numpy as np
import torch

from app.config import Settings, chunk_samples
from app.perch_inference import _load_perch_labels, _scores_to_probs
from app.tensorflow_threads import configure_tensorflow_threads, recommended_tf_intra_op_threads

logger = logging.getLogger(__name__)


class PerchTFLitePredictor:
    """Perch v2 TFLite runtime with the same waveform predictor contract as TensorFlow."""

    uses_baseline = False

    def __init__(self, settings: Settings, model_path: Path) -> None:
        if not model_path.is_file():
            raise FileNotFoundError(f"Perch TFLite model not found: {model_path}")
        labels_path = settings.perch_labels_path
        if not labels_path.is_file():
            labels_path = settings.perch_savedmodel_path / "assets" / "labels.csv"
        self.labels = _load_perch_labels(labels_path)
        self.settings = settings
        self.device = torch.device("cpu")
        self.baseline = np.zeros(len(self.labels), dtype=np.float32)
        self._chunk_samples = chunk_samples(settings)
        self._batch_size = max(1, settings.batch_size)
        self._lock = threading.Lock()

        import tensorflow as tf

        configure_tensorflow_threads(settings, intra_op=recommended_tf_intra_op_threads(settings))
        self.interpreter = tf.lite.Interpreter(
            model_path=str(model_path),
            num_threads=max(1, settings.num_threads),
        )
        self.interpreter.allocate_tensors()
        self._score_index = next(
            (
                out["index"]
                for out in self.interpreter.get_output_details()
                if int(out["shape_signature"][-1]) == len(self.labels)
            ),
            None,
        )
        if self._score_index is None:
            raise ValueError("No TFLite output matches the Perch label count")
        logger.info("Loaded Perch TFLite runtime from %s", model_path)

    def predict_waveform_batch(self, chunks: torch.Tensor) -> tuple[np.ndarray, None]:
        if chunks.ndim != 3 or chunks.shape[1] != 1 or chunks.shape[2] != self._chunk_samples:
            raise ValueError(f"expected chunks shape (N, 1, {self._chunk_samples}), got {tuple(chunks.shape)}")
        waveforms = chunks.squeeze(1).detach().cpu().numpy().astype(np.float32, copy=False)
        score_parts: list[np.ndarray] = []
        with self._lock:
            for start in range(0, len(waveforms), self._batch_size):
                batch = waveforms[start : start + self._batch_size]
                input_detail = self.interpreter.get_input_details()[0]
                self.interpreter.resize_tensor_input(input_detail["index"], batch.shape, strict=False)
                self.interpreter.allocate_tensors()
                input_detail = self.interpreter.get_input_details()[0]
                self.interpreter.set_tensor(
                    input_detail["index"], batch.astype(input_detail["dtype"], copy=False)
                )
                self.interpreter.invoke()
                score_parts.append(self.interpreter.get_tensor(self._score_index).copy())
        return _scores_to_probs(np.concatenate(score_parts, axis=0)), None
