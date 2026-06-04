from __future__ import annotations

import io
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import BinaryIO, Callable

import soundfile as sf
import torch
import torch.nn as nn
import torchaudio

logger = logging.getLogger(__name__)

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


def _waveform_is_empty(waveform: torch.Tensor) -> bool:
    return waveform.numel() == 0 or waveform.shape[-1] == 0


# torchaudio format ids (ffmpeg -f); temp files keep real extensions (.m4a)
_EXT_ALIASES: dict[str, str] = {
    "mpga": "mp3",
    "opus": "ogg",
    "m4a": "mp4",
    "aac": "mp4",
    "mov": "mp4",
    "mkv": "mp4",
    "3gp": "mp4",
}

# MP4/MOV/M4A often have moov at EOF — must decode from a seekable file, not stdin pipe.
_CONTAINER_SUFFIXES = frozenset(
    {".m4a", ".aac", ".mp4", ".mov", ".mkv", ".webm", ".3gp", ".m4v"}
)


def _ffmpeg_bin() -> str:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError(
            "ffmpeg not found on PATH. Install ffmpeg for MP3/M4A/WEBM/AAC support, "
            "or upload WAV/FLAC/OGG."
        )
    return ffmpeg


def _suffix_for_tempfile(filename: str | None, format_hint: str | None) -> str:
    if filename:
        suf = Path(filename).suffix.lower()
        if suf:
            return suf
    if format_hint == "mp4":
        return ".m4a"
    if format_hint == "mp3":
        return ".mp3"
    if format_hint == "webm":
        return ".webm"
    return ".bin"


def _wav_bytes_to_waveform(wav_bytes: bytes) -> tuple[torch.Tensor, int]:
    if not wav_bytes:
        raise ValueError("ffmpeg produced empty output")
    samples, sr = sf.read(io.BytesIO(wav_bytes), dtype="float32", always_2d=True)
    if samples.size == 0 or sr <= 0:
        raise ValueError("ffmpeg decoded zero audio samples")
    waveform = torch.from_numpy(samples.T.copy())
    if _waveform_is_empty(waveform):
        raise ValueError("ffmpeg decoded empty waveform")
    return waveform, int(sr)


def _ffmpeg_run(ffmpeg: str, input_args: list[str]) -> bytes:
    cmd = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        *input_args,
        "-vn",
        "-ac",
        "1",
        "-f",
        "wav",
        "pipe:1",
    ]
    proc = subprocess.run(cmd, capture_output=True, check=False)
    if proc.returncode != 0:
        err = (proc.stderr or b"").decode("utf-8", errors="replace").strip()
        raise RuntimeError(err or f"ffmpeg exited with code {proc.returncode}")
    return proc.stdout


def _decode_via_tempfile(
    ffmpeg: str, data: bytes, suffix: str
) -> tuple[torch.Tensor, int]:
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    try:
        with open(path, "wb") as f:
            f.write(data)
        wav = _ffmpeg_run(ffmpeg, ["-i", path])
        return _wav_bytes_to_waveform(wav)
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def _decode_via_pipe(
    ffmpeg: str, data: bytes, format_hint: str | None
) -> tuple[torch.Tensor, int]:
    input_args: list[str] = []
    if format_hint:
        input_args.extend(["-f", format_hint])
    input_args.extend(["-i", "pipe:0"])
    proc = subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            *input_args,
            "-vn",
            "-ac",
            "1",
            "-f",
            "wav",
            "pipe:1",
        ],
        input=data,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        err = (proc.stderr or b"").decode("utf-8", errors="replace").strip()
        raise RuntimeError(err or f"ffmpeg exited with code {proc.returncode}")
    return _wav_bytes_to_waveform(proc.stdout)


def _load_waveform_torchaudio_file(path: str) -> tuple[torch.Tensor, int]:
    waveform, sr = torchaudio.load(path)
    sr = int(sr)
    if waveform.ndim == 1:
        waveform = waveform.unsqueeze(0)
    return waveform, sr


def _load_waveform_ffmpeg(
    buf: BinaryIO,
    *,
    format_hint: str | None = None,
    filename: str | None = None,
) -> tuple[torch.Tensor, int]:
    """Decode via ffmpeg (temp file for M4A/MP4, then pipe / torchaudio fallbacks)."""
    ffmpeg = _ffmpeg_bin()

    buf.seek(0)
    data = buf.read()
    if not data:
        raise ValueError("empty audio buffer")

    suffix = _suffix_for_tempfile(filename, format_hint)
    ext = suffix.lower()
    prefer_tempfile = ext in _CONTAINER_SUFFIXES

    attempts: list[tuple[str, Callable[[], tuple[torch.Tensor, int]]]] = []
    if prefer_tempfile:
        attempts.append(
            ("tempfile", lambda: _decode_via_tempfile(ffmpeg, data, suffix))
        )
    attempts.extend(
        [
            ("pipe_auto", lambda: _decode_via_pipe(ffmpeg, data, None)),
            ("pipe_hint", lambda: _decode_via_pipe(ffmpeg, data, format_hint)),
        ]
    )
    if not prefer_tempfile:
        attempts.append(
            ("tempfile", lambda: _decode_via_tempfile(ffmpeg, data, suffix))
        )

    errors: list[str] = []
    for name, fn in attempts:
        if name == "pipe_hint" and not format_hint:
            continue
        try:
            return fn()
        except Exception as exc:
            msg = str(exc).strip() or repr(exc)
            logger.debug("ffmpeg %s failed: %s", name, msg)
            errors.append(f"{name}: {msg}")

    # torchaudio + temp file (uses torchcodec/ffmpeg internally)
    if suffix and suffix != ".bin":
        fd, path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        try:
            with open(path, "wb") as f:
                f.write(data)
            return _load_waveform_torchaudio_file(path)
        except Exception as exc:
            errors.append(f"torchaudio: {exc}")
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

    detail = errors[-1] if errors else "unknown decode error"
    raise RuntimeError(detail)


def _sniff_container_suffix(data: bytes) -> str | None:
    """Detect MP4/M4A family from ftyp box when filename lacks extension."""
    if len(data) < 12 or data[4:8] != b"ftyp":
        return None
    return ".m4a"


def format_hint_from_filename(filename: str | None) -> str | None:
    if not filename:
        return None
    ext = Path(filename).suffix.lower().lstrip(".")
    if not ext:
        return None
    return _EXT_ALIASES.get(ext, ext)


def load_waveform_full(
    source: BinaryIO | bytes,
    settings: Settings,
    device: torch.device,
    *,
    format_hint: str | None = None,
    filename: str | None = None,
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
    head = buf.read(64)
    buf.seek(0)
    sniffed_suffix = _sniff_container_suffix(head)

    hint = format_hint or format_hint_from_filename(filename)
    ext = Path(filename).suffix.lower() if filename else ""
    if not ext and sniffed_suffix:
        ext = sniffed_suffix
        if not hint and sniffed_suffix == ".m4a":
            hint = "mp4"
    needs_ffmpeg = hint in {"mp3", "mp4", "webm", "aac"} or ext in {
        ".m4a",
        ".aac",
        ".mp3",
        ".mp4",
        ".webm",
        ".mov",
        ".mkv",
    }

    buf.seek(0)
    waveform: torch.Tensor | None = None
    sr = 0

    if not needs_ffmpeg:
        try:
            data, sr = sf.read(buf, dtype="float32", always_2d=True)
            candidate = torch.from_numpy(data.T.copy())
            sr = int(sr)
            if not _waveform_is_empty(candidate) and sr > 0:
                waveform = candidate
        except Exception as sf_exc:
            logger.debug("soundfile decode failed (%s), trying ffmpeg", sf_exc)

    if waveform is None:
        buf.seek(0)
        try:
            waveform, sr = _load_waveform_ffmpeg(
                buf, format_hint=hint, filename=filename
            )
        except Exception as ff_exc:
            detail = str(ff_exc).strip() or "decode failed"
            raise RuntimeError(
                f"Could not decode audio ({ext or 'unknown'}): {detail}"
            ) from ff_exc

    if _waveform_is_empty(waveform) or sr <= 0:
        raise ValueError(f"decoded audio is empty ({ext or 'unknown'})")

    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    if sr != settings.sample_rate:
        if waveform.shape[1] < 1:
            raise ValueError("cannot resample empty waveform")
        waveform = torchaudio.functional.resample(
            waveform, sr, settings.sample_rate
        )

    if _waveform_is_empty(waveform):
        raise ValueError(f"audio has no samples after processing ({ext or 'unknown'})")

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
