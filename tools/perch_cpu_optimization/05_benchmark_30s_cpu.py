from __future__ import annotations

import argparse
import json
import statistics
import time

import numpy as np
import psutil
import soundfile as sf
import torch

from common import BENCHMARKS, REPORTS, ROOT, csv_write, file_size_mb, setup_paths, write_json, write_markdown
from runtime import available_runtimes, create_predictor


def windows_30s(audio: np.ndarray) -> tuple[torch.Tensor, list[torch.Tensor]]:
    full = torch.from_numpy(audio.astype(np.float32, copy=False)).reshape(1, -1)
    chunks = []
    for start_sec in range(30):
        start = start_sec * 32_000
        chunk = full[:, start : start + 160_000]
        chunk = torch.nn.functional.pad(chunk, (0, 160_000 - chunk.shape[-1]))
        chunks.append(chunk)
    return torch.stack(chunks), [chunks[i] for i in range(0, 30, 5)]


def measured_run(predictor, batch: torch.Tensor, display_chunks: list[torch.Tensor], xai_stride: float | None):
    from app.config import Settings
    from app.spectrogram import compute_spectrogram_payload
    from app.xai import generate_occlusion_heatmap

    settings = Settings(num_threads=2, spectrogram_parallel=1)
    started = time.perf_counter()
    probs, _ = predictor.predict_waveform_batch(batch)
    inference_seconds = time.perf_counter() - started
    spec_started = time.perf_counter()
    for chunk in display_chunks:
        compute_spectrogram_payload(chunk, settings, torch.device("cpu"))
    spectrogram_seconds = time.perf_counter() - spec_started
    xai_seconds = 0.0
    if xai_stride is not None:
        xai_started = time.perf_counter()
        for index, chunk in enumerate(display_chunks):
            target = int(np.argmax(probs[index * 5]))
            generate_occlusion_heatmap(chunk, predictor, target, sample_rate=32_000, window_sec=0.25, stride_sec=xai_stride)
        xai_seconds = time.perf_counter() - xai_started
    return {
        "total_seconds": inference_seconds + spectrogram_seconds + xai_seconds,
        "inference_seconds": inference_seconds,
        "spectrogram_seconds": spectrogram_seconds,
        "xai_seconds": xai_seconds,
        "per_window_inference_seconds": inference_seconds / 30,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runtimes", nargs="*", default=list(available_runtimes()))
    parser.add_argument("--measured-runs", type=int, default=3)
    parser.add_argument("--quick", action="store_true", help="One measured run per setting.")
    parser.add_argument("--output-stem", default="30s_cpu_benchmark")
    args = parser.parse_args()
    setup_paths()
    audio_path = BENCHMARKS / "synthetic_pipeline_test_30s.wav"
    audio, sr = sf.read(audio_path, dtype="float32")
    if sr != 32_000 or len(audio) != 30 * sr:
        raise ValueError("Benchmark audio must be exactly 30 seconds at 32 kHz")
    batch, display_chunks = windows_30s(audio)
    rows = []
    raw = []
    for runtime in args.runtimes:
        artifact = available_runtimes().get(runtime)
        if artifact is None or not artifact.exists():
            continue
        load_started = time.perf_counter()
        predictor = create_predictor(runtime)
        load_seconds = time.perf_counter() - load_started
        first_started = time.perf_counter()
        predictor.predict_waveform_batch(batch[:1])
        first_seconds = time.perf_counter() - first_started
        measured_run(predictor, batch, display_chunks, None)
        for xai_stride in (None, 0.3, 0.1):
            runs = [
                measured_run(predictor, batch, display_chunks, xai_stride)
                for _ in range(1 if args.quick else args.measured_runs)
            ]
            setting = "off" if xai_stride is None else str(xai_stride)
            row = {
                "runtime": runtime,
                "xai": setting,
                "model_size_mb": round(file_size_mb(artifact), 3),
                "load_seconds": round(load_seconds, 4),
                "first_inference_seconds": round(first_seconds, 4),
                "mean_total_seconds": round(statistics.mean(x["total_seconds"] for x in runs), 4),
                "best_total_seconds": round(min(x["total_seconds"] for x in runs), 4),
                "mean_per_window_inference_seconds": round(statistics.mean(x["per_window_inference_seconds"] for x in runs), 5),
                "mean_xai_seconds": round(statistics.mean(x["xai_seconds"] for x in runs), 4),
                "peak_memory_mb_approx": round(psutil.Process().memory_info().rss / 1024**2, 2),
                "runs": len(runs),
            }
            rows.append(row)
            raw.append({"setting": row, "runs": runs})
    fields = list(rows[0]) if rows else ["runtime", "xai"]
    csv_write(BENCHMARKS / f"{args.output_stem}.csv", rows, fields)
    write_json(BENCHMARKS / f"{args.output_stem}.json", raw)
    table = "| runtime | XAI | size MB | load s | first s | mean total s | best s | XAI-only s |\n|---|---:|---:|---:|---:|---:|---:|---:|\n"
    table += "\n".join(
        f"| {r['runtime']} | {r['xai']} | {r['model_size_mb']} | {r['load_seconds']} | {r['first_inference_seconds']} | {r['mean_total_seconds']} | {r['best_total_seconds']} | {r['mean_xai_seconds']} |"
        for r in rows
    )
    write_markdown(
        REPORTS / f"05_{args.output_stem}.md",
        "EchoWing Perch 30-second CPU Benchmark",
        [
            ("Method", "Exactly 30 seconds at 32 kHz; current 1-second inference stride creates 30 Perch windows; spectrograms and XAI are computed for the six display-aligned 5-second windows. One warmup precedes measured runs."),
            ("Results", table or "No runtime artifacts were available."),
            ("Caveat", "The generated test WAV is non-biological. Timing is valid for pipeline comparison; prediction quality is not."),
        ],
    )


if __name__ == "__main__":
    main()
