import logging
import numpy as np
import torch
import pandas as pd

from app.config import Settings

logger = logging.getLogger(__name__)

class SilicPredictor:
    """Wrapper for SILIC (Academia Sinica) PyTorch/ONNX model."""

    uses_baseline = False

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.device = torch.device("cpu")
        self.model_path = settings.silic_model_path
        self.taxonomy_path = settings.silic_taxonomy_csv_path
        
        logger.info("Loading SILIC model from %s", self.model_path)
        
        if self.taxonomy_path.is_file():
            df = pd.read_csv(self.taxonomy_path)
            self.labels = df["primary_label"].astype(str).tolist()
        else:
            self.labels = [f"SILIC_Class_{i}" for i in range(500)]
            
        self.baseline = np.zeros(len(self.labels), dtype=np.float32)

    def predict_waveform_batch(self, chunks: torch.Tensor) -> tuple[np.ndarray, np.ndarray | None]:
        """
        chunks: (N, 1, S) float32
        """
        # Placeholder for SILIC inference logic.
        # Once actual weights are loaded, this will run them.
        n = chunks.shape[0]
        # Return random probabilities as a placeholder until model is truly integrated
        out = np.random.rand(n, len(self.labels)).astype(np.float32)
        return out, None
