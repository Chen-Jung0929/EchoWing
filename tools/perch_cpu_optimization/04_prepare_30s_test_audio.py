from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
import soundfile as sf

from common import BENCHMARKS, ROOT, csv_write, setup_paths


def main() -> None:
    setup_paths()
    candidates = [
        p
        for folder in (ROOT / "wavs", ROOT / "backend")
        for pattern in ("*.wav", "*.flac", "*.ogg")
        for p in folder.rglob(pattern)
        if p.is_file()
    ]
    rows = []
    if candidates:
        source = candidates[0]
        audio, sr = sf.read(source, dtype="float32", always_2d=True)
        mono = audio.mean(axis=1)
        if sr != 32_000:
            raise RuntimeError(f"Existing test audio is {sr} Hz; use EchoWing decode path or provide 32 kHz WAV.")
        samples = np.pad(mono[: 30 * sr], (0, max(0, 30 * sr - len(mono))))[: 30 * sr]
        note = "Repository audio; biological suitability not independently verified."
    else:
        sr = 32_000
        t = np.arange(30 * sr, dtype=np.float32) / sr
        samples = (0.05 * np.sin(2 * np.pi * 1000 * t) + 0.02 * np.sin(2 * np.pi * 3200 * t)).astype(np.float32)
        source = None
        note = "Synthetic non-biological placeholder for pipeline/speed testing only; unsuitable for accuracy claims."
    target = BENCHMARKS / "synthetic_pipeline_test_30s.wav"
    sf.write(target, samples, sr, subtype="PCM_16")
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    rows.append(
        {
            "path": str(target.relative_to(ROOT)),
            "duration_seconds": 30,
            "sample_rate_hz": sr,
            "source": str(source) if source else "generated",
            "sha256": digest,
            "biological_accuracy_suitable": "no" if source is None else "unknown",
            "note": note,
        }
    )
    csv_write(BENCHMARKS / "test_audio_manifest.csv", rows, list(rows[0]))


if __name__ == "__main__":
    main()
