from __future__ import annotations

import numpy as np
import torch

from app.audio_mel import AudioToMelSpectrogram
from app.config import Settings
from app.schemas import SpectrogramPayload


def compute_spectrogram_payload(
    waveform: torch.Tensor,
    settings: Settings,
    device: torch.device,
) -> SpectrogramPayload:
    """
    Mel spectrogram (dB + per-chunk normalize) for one fixed-length chunk.
    Returns time-major uint8 grid for compact JSON transport.
    """
    mel = AudioToMelSpectrogram(settings, device).eval()
    w = waveform.to(device=device, dtype=torch.float32)
    if w.dim() == 1:
        w = w.unsqueeze(0)
    elif w.dim() == 3:
        w = w.squeeze(0)

    with torch.no_grad():
        spec = mel(w).squeeze(0).detach().cpu().numpy()

    if spec.ndim != 2:
        spec = spec.reshape(spec.shape[-2], spec.shape[-1])

    lo = float(spec.min())
    hi = float(spec.max())
    norm = np.clip((spec - lo) / (hi - lo + 1e-6), 0.0, 1.0)
    spec_u8 = (norm * 255.0).astype(np.uint8)
    spec_time_major = spec_u8.T

    return SpectrogramPayload(
        time_frames=int(spec_time_major.shape[0]),
        freq_bins=int(spec_time_major.shape[1]),
        sample_rate=settings.sample_rate,
        hop_length=512,
        n_fft=2048,
        fmax_hz=16_000.0,
        values=spec_time_major.tolist(),
    )
