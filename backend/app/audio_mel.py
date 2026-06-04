from __future__ import annotations

import io
from typing import BinaryIO

import soundfile as sf
import torch
import torch.nn as nn
import torchaudio

from app.config import Settings, chunk_samples


class AudioToMelSpectrogram(nn.Module):
    """Matches notebook-05-03 Mel + dB + global normalization."""

    def __init__(self, settings: Settings, device: torch.device) -> None:
        super().__init__()
        sr = settings.sample_rate
        self.mel_spec = torchaudio.transforms.MelSpectrogram(
            sample_rate=sr,
            n_fft=2048,
            hop_length=512,
            n_mels=128,
            f_min=20,
            f_max=16_000,
        ).to(device)
        self.amplitude_to_db = torchaudio.transforms.AmplitudeToDB(top_db=80).to(device)

    def forward(self, waveform: torch.Tensor) -> torch.Tensor:
        mel = self.mel_spec(waveform)
        mel = self.amplitude_to_db(mel)
        mel = (mel - mel.mean()) / (mel.std() + 1e-6)
        return mel


def configure_torch_threads(num_threads: int) -> None:
    try:
        torch.set_num_threads(num_threads)
    except RuntimeError:
        pass
    try:
        torch.set_num_interop_threads(1)
    except RuntimeError:
        pass


def _load_waveform_torchaudio(
    buf: BinaryIO, format_hint: str | None
) -> tuple[torch.Tensor, int]:
    """Fallback when format is not WAV or soundfile cannot read the stream."""
    buf.seek(0)
    waveform, sr_t = torchaudio.load(buf, format=format_hint)
    return waveform, int(sr_t)


def load_waveform_full(
    source: BinaryIO | bytes,
    settings: Settings,
    device: torch.device,
    *,
    format_hint: str | None = None,
) -> torch.Tensor:
    """
    Decode audio, mono, resample to sample_rate, but keeps the full length.
    Returns shape (1, samples).
    """
    buf: BinaryIO
    if isinstance(source, bytes):
        buf = io.BytesIO(source)
    else:
        buf = source

    buf.seek(0)
    if format_hint in (None, "wav"):
        try:
            data, sr = sf.read(buf, dtype="float32", always_2d=True)
            waveform = torch.from_numpy(data.T.copy())
            sr = int(sr)
        except Exception:
            waveform, sr = _load_waveform_torchaudio(buf, format_hint)
    else:
        waveform, sr = _load_waveform_torchaudio(buf, format_hint)

    if sr != settings.sample_rate:
        waveform = torchaudio.functional.resample(
            waveform, sr, settings.sample_rate
        )

    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    if waveform.numel() == 0 or waveform.shape[1] == 0:
        # Fallback empty
        waveform = torch.zeros((1, settings.sample_rate), dtype=torch.float32)

    return waveform.contiguous().to(device=device, dtype=torch.float32)

def load_waveform_fixed_chunk(
    source: BinaryIO | bytes,
    settings: Settings,
    device: torch.device,
    *,
    format_hint: str | None = None,
) -> torch.Tensor:
    waveform = load_waveform_full(source, settings, device, format_hint=format_hint)
    target = chunk_samples(settings)
    n = waveform.shape[1]
    if n < target:
        waveform = torch.nn.functional.pad(waveform, (0, target - n))
    elif n > target:
        waveform = waveform[:, :target]
    return waveform
