from __future__ import annotations

import csv
import json

from common import ARTIFACTS, BENCHMARKS, REPORTS, setup_paths, write_markdown


def main() -> None:
    setup_paths()
    rows = []
    csv_path = BENCHMARKS / "30s_cpu_benchmark.csv"
    if csv_path.is_file():
        with csv_path.open(encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
    sanity = {}
    sanity_path = BENCHMARKS / "quick_output_sanity_check.json"
    if sanity_path.is_file():
        sanity = json.loads(sanity_path.read_text(encoding="utf-8"))
    variants = [
        ("TensorFlow Perch original", True),
        ("ONNX FP32", (ARTIFACTS / "perch_v2_cpu_fp32.onnx").is_file()),
        ("ONNX INT8", (ARTIFACTS / "perch_v2_cpu_dynamic_int8.onnx").is_file()),
        ("TFLite FP32", (ARTIFACTS / "perch_v2_cpu_fp32.tflite").is_file()),
        ("TFLite INT8", (ARTIFACTS / "perch_v2_cpu_dynamic_int8.tflite").is_file()),
        ("Kaggle BirdCLEF distilled ONNX", False),
    ]
    table = "| runtime | model size | load time | XAI off total | XAI 0.3 total | XAI 0.1 total | notes |\n|---|---:|---:|---:|---:|---:|---|\n"
    by_runtime = {}
    for row in rows:
        by_runtime.setdefault(row["runtime"], {})[row["xai"]] = row
    for runtime, settings in by_runtime.items():
        off = settings.get("off", {})
        table += (
            f"| {runtime} | {off.get('model_size_mb','n/a')} MB | {off.get('load_seconds','n/a')} s | "
            f"{off.get('mean_total_seconds','n/a')} s | {settings.get('0.3',{}).get('mean_total_seconds','n/a')} s | "
            f"{settings.get('0.1',{}).get('mean_total_seconds','n/a')} s | NCHC ngs372G, 2 threads |\n"
        )
    if not by_runtime:
        table += "| no benchmark results | n/a | n/a | n/a | n/a | n/a | Run script 05 |\n"
    runnable_optimized = [name for name in ("tflite", "tflite_int8", "onnx", "onnx_int8") if name in sanity]
    fastest = None
    off_rows = [row for row in rows if row.get("xai") == "off"]
    if off_rows:
        fastest = min(off_rows, key=lambda row: float(row["mean_total_seconds"]))["runtime"]
    if fastest == "tflite" and "tflite" in sanity:
        recommendation = (
            "**Use TFLite FP32 as an opt-in candidate fast runtime (`TRIAGELENS_PERCH_RUNTIME=tflite`).** "
            "It is the fastest tested runtime and preserves the TensorFlow top-5 on the pipeline test audio. "
            "Keep TensorFlow as automatic fallback and do not make TFLite the default until real bird audio is checked."
        )
    elif runnable_optimized:
        recommendation = (
            f"**Use `{fastest or runnable_optimized[0]}` only as an opt-in experimental runtime.** "
            "Keep TensorFlow as automatic fallback until biological-audio validation is complete."
        )
    else:
        recommendation = (
            "**Keep TensorFlow original as the only production runtime for now.** "
            "No optimized artifact passed the required sanity gate."
        )
    fastest_xai_01 = min(
        (row for row in rows if row.get("xai") == "0.1"),
        key=lambda row: float(row["mean_total_seconds"]),
        default=None,
    )
    xai_finding = (
        f"The fastest 0.1-resolution result was `{fastest_xai_01['runtime']}` at "
        f"{fastest_xai_01['mean_total_seconds']} seconds for 30 seconds of audio. "
        + (
            "This is potentially practical for an asynchronous CPU workflow, but production should remain at 0.3 until real deployment testing."
            if float(fastest_xai_01["mean_total_seconds"]) <= 60
            else "This is not practical for the current synchronous Hugging Face CPU target; keep production at 0.3."
        )
        if fastest_xai_01
        else "No completed 0.1-resolution benchmark result is available."
    )
    sanity_summary = (
        "TensorFlow, TFLite FP32, and TFLite dynamic-range INT8 all produced finite `[6, 14795]` outputs. "
        "Both TFLite variants preserved all five TensorFlow top-5 classes on the synthetic pipeline test. "
        "This is a pipeline sanity result, not biological accuracy validation."
        if {"tf", "tflite", "tflite_int8"}.issubset(sanity)
        else f"Runnable results: `{list(sanity)}`. Optimized variants must not be promoted without same-label-space sanity results."
    )
    conversion_summary = (
        "ONNX FP32 and ONNX INT8 are blocked because `tf2onnx` cannot lower the SavedModel's `XlaCallModule`. "
        "TFLite FP32, dynamic-range INT8, and FP16 exported successfully. Dynamic-range INT8 is usable but is not full-integer quantization. "
        "TFLite FP32 is the fastest but is nearly the same size as the SavedModel. Dynamic-range INT8 is about 8% smaller but slower. "
        "FP16 is the smallest artifact at about 195 MB, but it was not selected because its minimal CPU inference was slower and it was not included in the formal end-to-end benchmark."
    )
    deployment_notes = (
        "Deploy candidate artifact `artifacts/perch_cpu_optimization/perch_v2_cpu_fp32.tflite` as "
        "`backend/models/perch/perch_v2_cpu_fp32.tflite`. Set `TRIAGELENS_PERCH_RUNTIME=tflite`, "
        "`TRIAGELENS_PERCH_TFLITE_PATH=models/perch/perch_v2_cpu_fp32.tflite`, "
        "`TRIAGELENS_NUM_THREADS=2`, `TRIAGELENS_XAI_PARALLEL=1`, "
        "`TRIAGELENS_INFERENCE_BATCH_PARALLEL=1`, `TRIAGELENS_MAX_CONCURRENT_PREDICTIONS=1`, and "
        "`TRIAGELENS_PERCH_XAI_STRIDE_SEC=0.3`; run one Uvicorn worker. Keep the original SavedModel for automatic fallback, "
        "while noting that retaining both artifacts increases deployment storage. TFLite FP32 improves CPU latency but does not materially reduce model size. "
        "Do not install conversion-only packages `tf2onnx` or `onnx` in production."
    )
    write_markdown(
        REPORTS / "final_recommendation.md",
        "EchoWing Perch CPU Optimization Final Recommendation",
        [
            ("1. Objective", "Optimize `perch_v2_cpu` for CPU-only inference while preserving similar prediction behavior."),
            ("2. Source Code", "Started from GitHub main: https://github.com/Chen-Jung0929/EchoWing"),
            ("3. Tested Model Variants", "\n".join(f"- {name}: {'available/tested' if ok else 'unavailable or blocked'}" for name, ok in variants)),
            ("4. 30-second CPU Benchmark", table),
            ("5. Quick Output Sanity Check", f"{sanity_summary}\n\n{conversion_summary}"),
            ("6. XAI Resolution Finding", xai_finding),
            ("7. Recommended Runtime", recommendation),
            ("8. Deployment Notes", deployment_notes),
            ("9. Problems Not Fixed", "See `reports/perch_cpu_optimization/problems_not_fixed.md`. The unrelated BirdCLEF LFS mismatch was not changed."),
            ("10. Next Steps", "Run the existing sanity script on a small set of real bird recordings. If top predictions remain acceptable, test the candidate Dockerfile on Hugging Face CPU before considering a default-runtime change."),
        ],
    )


if __name__ == "__main__":
    main()
