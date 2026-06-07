# NCHC Benchmarked Artifact Manifest

These are the model artifacts generated and benchmarked on NCHC in job
`1472128`. The exact benchmarked artifacts are tracked on the feature branch
through Git LFS.

| artifact | size MB | SHA256 | status |
|---|---:|---|---|
| `perch_v2_cpu_fp32.tflite` | 388.48 | `9ac770d2cfb830d83379c527e323570d42db3c39bd7336af45ea1599b094fb1b` | Recommended opt-in fast runtime |
| `perch_v2_cpu_dynamic_int8.tflite` | 358.93 | `dfb2124386b72f91c006bb155cbf12b7c121867296626cf4ce32b9d0410655a3` | Works, but slower than FP32 |
| `perch_v2_cpu_fp16.tflite` | 194.51 | `dad396b03363b4f0616e6d9ae4f691df328e54a1e9dbe1d2e814d58e1a48f999` | Smallest; not formally benchmarked end-to-end |

ONNX FP32 and ONNX INT8 were not produced because `tf2onnx` cannot lower the
SavedModel's `XlaCallModule`.
