from __future__ import annotations

import csv
import json

from common import BENCHMARKS, REPORTS, csv_write, setup_paths, write_json, write_markdown


def main() -> None:
    setup_paths()
    stems = [
        "30s_cpu_benchmark_tf",
        "30s_cpu_benchmark_tflite",
        "30s_cpu_benchmark_tflite_int8",
    ]
    rows = []
    raw = []
    for stem in stems:
        csv_path = BENCHMARKS / f"{stem}.csv"
        json_path = BENCHMARKS / f"{stem}.json"
        if not csv_path.is_file() or not json_path.is_file():
            raise FileNotFoundError(f"Missing parallel benchmark output: {stem}")
        with csv_path.open(encoding="utf-8") as handle:
            rows.extend(csv.DictReader(handle))
        raw.extend(json.loads(json_path.read_text(encoding="utf-8")))
    csv_write(BENCHMARKS / "30s_cpu_benchmark.csv", rows, list(rows[0]))
    write_json(BENCHMARKS / "30s_cpu_benchmark.json", raw)
    table = "| runtime | XAI | size MB | load s | first s | mean total s | best s | XAI-only s |\n|---|---:|---:|---:|---:|---:|---:|---:|\n"
    table += "\n".join(
        f"| {r['runtime']} | {r['xai']} | {r['model_size_mb']} | {r['load_seconds']} | {r['first_inference_seconds']} | {r['mean_total_seconds']} | {r['best_total_seconds']} | {r['mean_xai_seconds']} |"
        for r in rows
    )
    write_markdown(
        REPORTS / "05_30s_cpu_benchmark.md",
        "EchoWing Perch 30-second CPU Benchmark",
        [
            ("Method", "Three runtime-specific benchmark processes ran concurrently on one NCHC ngs372G CPU node. Each runtime remained limited to two inference-library threads and used one warmup plus three measured runs per XAI setting."),
            ("Results", table),
            ("Caveat", "The generated test WAV is non-biological. Timing is valid for pipeline comparison; prediction quality is not. Memory is approximate process RSS, not a rigorously sampled peak."),
        ],
    )


if __name__ == "__main__":
    main()
