"""
上傳 chunk_0.wav 與 chunk_1.wav 測試 POST /api/predict。

使用前請先啟動 API（在 backend 目錄）：
  uvicorn app.main:app --host 127.0.0.1 --port 8000

依賴：
  pip install httpx

純 curl 範例（PowerShell，路徑請改成你的 WAV）：
  curl.exe -s -X POST "http://localhost:8000/api/predict" `
    -F "audio_chunks=@chunk_0.wav;filename=chunk_0.wav" `
    -F "audio_chunks=@chunk_1.wav;filename=chunk_1.wav" `
    -F "original_filename=test.wav" `
    -F "sample_rate=32000"
"""

from __future__ import annotations

import argparse
import json
import struct
import tempfile
import wave
from pathlib import Path

SAMPLE_RATE_DEFAULT = 32_000
CHUNK_SEC = 5


def write_silent_mono_wav(path: Path, *, sample_rate: int, duration_sec: int) -> None:
    """16-bit PCM mono WAV（與前端 5 秒 chunk 一致）。"""
    n_samples = sample_rate * duration_sec
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        silent = struct.pack("<h", 0) * n_samples
        wf.writeframes(silent)


def main() -> None:
    parser = argparse.ArgumentParser(description="Test /api/predict with chunk_0 and chunk_1")
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:8000",
        help="API origin (no trailing slash)",
    )
    parser.add_argument(
        "--keep-wavs",
        type=Path,
        default=None,
        help="若指定目錄，將測試 WAV 寫入該處而不刪除",
    )
    args = parser.parse_args()

    try:
        import httpx
    except ImportError as e:
        raise SystemExit("請先安裝 httpx：pip install httpx") from e

    base: str = args.base_url.rstrip("/")

    if args.keep_wavs:
        d = Path(args.keep_wavs)
        d.mkdir(parents=True, exist_ok=True)
        p0, p1 = d / "chunk_0.wav", d / "chunk_1.wav"
        write_silent_mono_wav(p0, sample_rate=SAMPLE_RATE_DEFAULT, duration_sec=CHUNK_SEC)
        write_silent_mono_wav(p1, sample_rate=SAMPLE_RATE_DEFAULT, duration_sec=CHUNK_SEC)
        ctx = None
        paths = (p0, p1)
    else:
        tmp = tempfile.TemporaryDirectory(prefix="triage_predict_test_")
        d = Path(tmp.name)
        p0, p1 = d / "chunk_0.wav", d / "chunk_1.wav"
        write_silent_mono_wav(p0, sample_rate=SAMPLE_RATE_DEFAULT, duration_sec=CHUNK_SEC)
        write_silent_mono_wav(p1, sample_rate=SAMPLE_RATE_DEFAULT, duration_sec=CHUNK_SEC)
        ctx = tmp

    try:
        url = f"{base}/api/predict"
        files = [
            ("audio_chunks", ("chunk_0.wav", p0.read_bytes(), "audio/wav")),
            ("audio_chunks", ("chunk_1.wav", p1.read_bytes(), "audio/wav")),
        ]
        data = {
            "original_filename": "script_test.wav",
            "sample_rate": str(SAMPLE_RATE_DEFAULT),
        }
        with httpx.Client(timeout=120.0) as client:
            r = client.post(url, files=files, data=data)

        print(f"HTTP {r.status_code}")
        try:
            body = r.json()
            print(json.dumps(body, indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            print(r.text)

        if r.status_code != 200:
            raise SystemExit(1)

        chunks = body.get("chunks", [])
        if len(chunks) != 2:
            print(f"[WARN] 預期 2 個 chunk，實際 {len(chunks)}")
            raise SystemExit(1)
        for c in chunks:
            if c.get("error"):
                print(f"[FAIL] chunk index {c.get('index')}: {c['error']}")
                raise SystemExit(1)
            pr = c.get("probs") or []
            print(
                f"[OK] chunk index {c.get('index')}: len(probs)={len(pr)}, "
                f"top_k[0]={(c.get('top_k') or [None])[0]}"
            )
    finally:
        if ctx is not None:
            ctx.cleanup()


if __name__ == "__main__":
    main()
