import logging
import numpy as np
import torch

logger = logging.getLogger(__name__)

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
        # 1. Get baseline probability for the target class on the unmasked audio
        # Reshape to (1, 1, S) which the predictor expects
        batch_input = waveform.unsqueeze(0)
        base_probs, _ = predictor.predict_waveform_batch(batch_input)
        base_prob = base_probs[0, target_class_index]
        
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
            
        # Batch inference on all masked waveforms
        # Stack to (N, 1, S)
        batch_masked = torch.stack(masked_waveforms, dim=0).unsqueeze(1)
        masked_probs, _ = predictor.predict_waveform_batch(batch_masked)
        
        # 3. Calculate importance
        # Importance = Base_Prob - Masked_Prob
        # A positive importance means masking this segment caused a drop in confidence,
        # hence this segment is important for the prediction.
        heatmap = np.zeros(len(positions), dtype=float)
        
        for i in range(len(positions)):
            masked_prob = masked_probs[i, target_class_index]
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
