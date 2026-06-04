import logging
import numpy as np
import torch

logger = logging.getLogger(__name__)


def _waveform_1ch(waveform: torch.Tensor) -> torch.Tensor:
    """Normalize input to (1, S) for masking."""
    w = waveform
    while w.ndim > 2:
        w = w.squeeze(0)
    if w.ndim == 1:
        w = w.unsqueeze(0)
    return w


def _batch_n1s(waveform: torch.Tensor) -> torch.Tensor:
    """Normalize input to (N, 1, S) for predict_waveform_batch."""
    w = _waveform_1ch(waveform)
    return w.unsqueeze(0)


def generate_occlusion_heatmap(
    waveform: torch.Tensor,
    predictor,
    target_class_index: int,
    sample_rate: int = 32000,
    window_sec: float = 0.25,
    stride_sec: float = 0.1,
) -> list[float]:
    """
    Generates a 1D time-based heatmap (importance array) using Occlusion Sensitivity.
    We iteratively mask (zero out) a sliding window of the audio and observe the
    drop in the target class probability.
    
    waveform: (1, S) float32 tensor
    predictor: An object with `predict_waveform_batch` method
    target_class_index: The index of the species we are explaining
    """
    try:
        waveform = _waveform_1ch(waveform)

        # 1. Get baseline probability for the target class on the unmasked audio
        batch_input = _batch_n1s(waveform)
        base_probs, _ = predictor.predict_waveform_batch(batch_input)
        probs_row = np.asarray(base_probs[0], dtype=np.float32).ravel()
        if probs_row.size == 0:
            return []
        target_class_index = int(target_class_index) % probs_row.size
        base_prob = float(probs_row[target_class_index])
        
        # If the base prob is very low, heatmap might be noisy, but we'll compute it anyway
        if base_prob < 0.01:
            return []

        # 2. Setup sliding window parameters
        total_samples = waveform.shape[-1]
        window_samples = int(window_sec * sample_rate)
        stride_samples = int(stride_sec * sample_rate)
        
        if window_samples >= total_samples:
            return []

        # Generate masked versions
        masked_waveforms = []
        positions = []
        
        for start in range(0, total_samples - window_samples + 1, stride_samples):
            end = start + window_samples
            masked_wave = waveform.clone()
            masked_wave[0, start:end] = 0.0 # Mute this segment
            masked_waveforms.append(masked_wave)
            positions.append(start)
            
        if not masked_waveforms:
            return []
            
        # Batch inference on all masked waveforms -> (N, 1, S)
        batch_masked = torch.stack(masked_waveforms, dim=0)
        masked_probs, _ = predictor.predict_waveform_batch(batch_masked)
        masked_probs = np.asarray(masked_probs, dtype=np.float32)
        if masked_probs.ndim == 1:
            masked_probs = masked_probs.reshape(1, -1)

        # 3. Calculate importance
        # Importance = Base_Prob - Masked_Prob
        # A positive importance means masking this segment caused a drop in confidence,
        # hence this segment is important for the prediction.
        heatmap = np.zeros(len(positions), dtype=float)

        for i in range(len(positions)):
            row = np.asarray(masked_probs[i], dtype=np.float32).ravel()
            idx = target_class_index if target_class_index < row.size else row.size - 1
            masked_prob = float(row[idx]) if row.size else 0.0
            drop = base_prob - masked_prob
            heatmap[i] = float(drop)
            
        # 4. Normalize heatmap between 0 and 1
        max_drop = np.max(heatmap)
        min_drop = np.min(heatmap)
        
        if max_drop > 0:
            heatmap = np.clip(heatmap / max_drop, 0.0, 1.0)
        else:
            heatmap = np.zeros_like(heatmap)
            
        return heatmap.tolist()
        
    except Exception as e:
        logger.warning(f"Failed to generate occlusion heatmap: {e}")
        return []
