# EchoWing Perch CPU Optimization Final Recommendation

## 1. Objective

Optimize `perch_v2_cpu` for CPU-only inference while preserving similar prediction behavior.

## 2. Source Code

Started from GitHub main: https://github.com/Chen-Jung0929/EchoWing

## 3. Tested Model Variants

- TensorFlow Perch original: available/tested
- ONNX FP32: unavailable or blocked
- ONNX INT8: unavailable or blocked
- TFLite FP32: available/tested
- TFLite INT8: available/tested
- Kaggle BirdCLEF distilled ONNX: unavailable or blocked

## 4. 30-second CPU Benchmark

| runtime | model size | load time | XAI off total | XAI 0.3 total | XAI 0.1 total | notes |
|---|---:|---:|---:|---:|---:|---|
| tf | 391.269 MB | 6.65 s | 17.4425 s | 79.0916 s | 173.3517 s | NCHC ngs372G, 2 threads |
| tflite | 388.478 MB | 2.5499 s | 6.0555 s | 28.9701 s | 65.3248 s | NCHC ngs372G, 2 threads |
| tflite_int8 | 358.928 MB | 2.5219 s | 7.1877 s | 33.9078 s | 75.7555 s | NCHC ngs372G, 2 threads |

## 5. Quick Output Sanity Check

TensorFlow, TFLite FP32, and TFLite dynamic-range INT8 all produced finite `[6, 14795]` outputs. Both TFLite variants preserved all five TensorFlow top-5 classes on the synthetic pipeline test. This is a pipeline sanity result, not biological accuracy validation.

ONNX FP32 and ONNX INT8 are blocked because `tf2onnx` cannot lower the SavedModel's `XlaCallModule`. TFLite FP32, dynamic-range INT8, and FP16 exported successfully. Dynamic-range INT8 is usable but is not full-integer quantization. TFLite FP32 is the fastest but is nearly the same size as the SavedModel. Dynamic-range INT8 is about 8% smaller but slower. FP16 is the smallest artifact at about 195 MB, but it was not selected because its minimal CPU inference was slower and it was not included in the formal end-to-end benchmark.

## 6. XAI Resolution Finding

The fastest 0.1-resolution result was `tflite` at 65.3248 seconds for 30 seconds of audio. This is not practical for the current synchronous Hugging Face CPU target; keep production at 0.3.

## 7. Recommended Runtime

**Use TFLite FP32 as an opt-in candidate fast runtime (`TRIAGELENS_PERCH_RUNTIME=tflite`).** It is the fastest tested runtime and preserves the TensorFlow top-5 on the pipeline test audio. Keep TensorFlow as automatic fallback and do not make TFLite the default until real bird audio is checked.

## 8. Deployment Notes

Deploy candidate artifact `artifacts/perch_cpu_optimization/perch_v2_cpu_fp32.tflite` as `backend/models/perch/perch_v2_cpu_fp32.tflite`. Set `TRIAGELENS_PERCH_RUNTIME=tflite`, `TRIAGELENS_PERCH_TFLITE_PATH=models/perch/perch_v2_cpu_fp32.tflite`, `TRIAGELENS_NUM_THREADS=2`, `TRIAGELENS_XAI_PARALLEL=1`, `TRIAGELENS_INFERENCE_BATCH_PARALLEL=1`, `TRIAGELENS_MAX_CONCURRENT_PREDICTIONS=1`, and `TRIAGELENS_PERCH_XAI_STRIDE_SEC=0.3`; run one Uvicorn worker. Keep the original SavedModel for automatic fallback, while noting that retaining both artifacts increases deployment storage. TFLite FP32 improves CPU latency but does not materially reduce model size. Do not install conversion-only packages `tf2onnx` or `onnx` in production.

## 9. Problems Not Fixed

See `reports/perch_cpu_optimization/problems_not_fixed.md`. The unrelated BirdCLEF LFS mismatch was not changed.

## 10. Next Steps

Run the existing sanity script on a small set of real bird recordings. If top predictions remain acceptable, test the candidate Dockerfile on Hugging Face CPU before considering a default-runtime change.
