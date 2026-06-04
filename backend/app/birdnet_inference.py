import logging
import numpy as np
import torch
import pandas as pd

from app.config import Settings

logger = logging.getLogger(__name__)

def _import_tflite():
    try:
        import tflite_runtime.interpreter as tflite
        return tflite
    except ImportError:
        import tensorflow as tf
        return tf.lite

class BirdNetPredictor:
    """Wrapper for BirdNET-Analyzer TFLite model."""

    uses_baseline = False
    
    # BirdNET expects 3-second chunks at 48kHz by default, but we can resample or feed 32kHz depending on the specific model.
    # The standard BirdNET uses 48kHz. If our global setting is 32kHz, we either resample here or require the frontend to send native.
    # We'll assume the model expects 48kHz, so we'll resample on the fly if needed.

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
            with open(self.labels_path, 'r', encoding='utf-8') as f:
                self.labels = [line.strip() for line in f.readlines()]
        else:
            self.labels = [f"BirdNET_Class_{i}" for i in range(6522)]
            
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
        
        # BirdNET expects specific input shape (usually 144000 samples for 3s @ 48kHz).
        # We need to adapt the input to the exact model signature.
        input_shape = self.input_details[0]['shape']
        expected_samples = input_shape[1] if len(input_shape) > 1 else input_shape[0]
        
        probs_parts = []
        for i in range(n):
            wave = waveforms[i]
            # Pad or truncate to expected samples
            if len(wave) < expected_samples:
                wave = np.pad(wave, (0, expected_samples - len(wave)))
            elif len(wave) > expected_samples:
                wave = wave[:expected_samples]
                
            input_tensor = wave.reshape(input_shape).astype(np.float32)
            self.interpreter.set_tensor(self.input_details[0]['index'], input_tensor)
            self.interpreter.invoke()
            probs = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
            probs_parts.append(probs)
            
        out = np.stack(probs_parts, axis=0)
        return np.clip(np.nan_to_num(out, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0).astype(np.float32, copy=False), None
