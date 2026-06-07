# EchoWing Perch 30-second CPU Benchmark

## Method

Three runtime-specific benchmark processes ran concurrently on one NCHC ngs372G CPU node. Each runtime remained limited to two inference-library threads and used one warmup plus three measured runs per XAI setting.

## Results

| runtime | XAI | size MB | load s | first s | mean total s | best s | XAI-only s |
|---|---:|---:|---:|---:|---:|---:|---:|
| tf | off | 391.269 | 6.65 | 1.0761 | 17.4425 | 17.2471 | 0.0 |
| tf | 0.3 | 391.269 | 6.65 | 1.0761 | 79.0916 | 78.7421 | 61.7219 |
| tf | 0.1 | 391.269 | 6.65 | 1.0761 | 173.3517 | 173.1139 | 157.6898 |
| tflite | off | 388.478 | 2.5499 | 1.395 | 6.0555 | 6.0246 | 0.0 |
| tflite | 0.3 | 388.478 | 2.5499 | 1.395 | 28.9701 | 28.8708 | 23.1465 |
| tflite | 0.1 | 388.478 | 2.5499 | 1.395 | 65.3248 | 65.172 | 59.5855 |
| tflite_int8 | off | 358.928 | 2.5219 | 1.1906 | 7.1877 | 7.162 | 0.0 |
| tflite_int8 | 0.3 | 358.928 | 2.5219 | 1.1906 | 33.9078 | 33.6983 | 27.0608 |
| tflite_int8 | 0.1 | 358.928 | 2.5219 | 1.1906 | 75.7555 | 75.1604 | 69.0661 |

## Caveat

The generated test WAV is non-biological. Timing is valid for pipeline comparison; prediction quality is not. Memory is approximate process RSS, not a rigorously sampled peak.
