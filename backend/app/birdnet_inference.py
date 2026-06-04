import logging

import numpy as np
import torch

from app.config import Settings

logger = logging.getLogger(__name__)

# BirdNET v2.4 audio-model.tflite: 3 s @ 48 kHz mono waveform (144000 samples).
BIRDNET_SAMPLE_RATE = 48_000
BIRDNET_CHUNK_SAMPLES = 144_000


def _import_tflite():
    try:
        import tflite_runtime.interpreter as tflite
        return tflite
    except ImportError:
        import tensorflow as tf
        return tf.lite

def _resample_waveform(wave: np.ndarray, src_sr: int, dst_sr: int) -> np.ndarray:
    """Linear resample mono float32 waveform."""
    if src_sr == dst_sr:
        return wave.astype(np.float32, copy=False)
    n_out = max(1, int(round(len(wave) * dst_sr / src_sr)))
    x_src = np.arange(len(wave), dtype=np.float64)
    x_dst = np.linspace(0, len(wave) - 1, num=n_out, dtype=np.float64)
    return np.interp(x_dst, x_src, wave).astype(np.float32)


def _load_label_lines(path) -> list[str]:
    with open(path, encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


class BirdNetPredictor:
    """BirdNET v2.4 acoustic TFLite (audio-model.tflite)."""

    uses_baseline = False

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.device = torch.device("cpu")
        self.model_path = settings.birdnet_model_path
        self.labels_path = settings.birdnet_labels_path

        tflite = _import_tflite()
        
        logger.info("Loading BirdNET TFLite from %s", self.model_path)
        try:
            self.interpreter = tflite.Interpreter(model_path=str(self.model_path))
            self.interpreter.allocate_tensors()
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
        except Exception as e:
            logger.warning(f"Could not load BirdNET model: {e}")
            self.interpreter = None
            
        if self.labels_path.is_file():
            self.labels = _load_label_lines(self.labels_path)
        else:
            self.labels = [f"BirdNET_Class_{i}" for i in range(6522)]
        if self.interpreter is not None:
            out_size = self.output_details[0]["shape"][-1]
            if len(self.labels) != out_size:
                logger.warning(
                    "BirdNET label count %s != model output %s",
                    len(self.labels),
                    out_size,
                )
            
        self.baseline = np.zeros(len(self.labels), dtype=np.float32)

    def predict_waveform_batch(self, chunks: torch.Tensor) -> tuple[np.ndarray, np.ndarray | None]:
        """
        chunks: (N, 1, S) float32
        Returns (probs, None)
        """
        if self.interpreter is None:
            raise RuntimeError("BirdNET model not loaded.")
            
        waveforms = chunks.squeeze(1).detach().cpu().numpy().astype(np.float32, copy=False)
        n = waveforms.shape[0]
        src_sr = self.settings.sample_rate
        input_shape = tuple(self.input_details[0]["shape"])
        expected_samples = int(input_shape[-1])

        probs_parts = []
        for i in range(n):
            wave = _resample_waveform(waveforms[i], src_sr, BIRDNET_SAMPLE_RATE)
            if len(wave) < expected_samples:
                wave = np.pad(wave, (0, expected_samples - len(wave)))
            elif len(wave) > expected_samples:
                wave = wave[:expected_samples]

            input_tensor = wave.reshape(input_shape).astype(np.float32)
            self.interpreter.set_tensor(self.input_details[0]["index"], input_tensor)
            self.interpreter.invoke()
            logits = self.interpreter.get_tensor(self.output_details[0]["index"])[0]
            # v2.4 TFLite may return logits; apply sigmoid if not already probabilities.
            if logits.min() < 0.0 or logits.max() > 1.0:
                logits = 1.0 / (1.0 + np.exp(-logits))
            probs_parts.append(logits.astype(np.float32, copy=False))
            
        out = np.stack(probs_parts, axis=0)
        return np.clip(np.nan_to_num(out, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0).astype(np.float32, copy=False), None
