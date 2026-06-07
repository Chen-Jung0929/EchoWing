# ml_validation_scientist Summary

The agent was successfully invoked against `C:\EchoWing`. Its output was generic rather than bioacoustics-specific, but it supports using an explicit validation gate before model promotion.

Project-specific gate adopted by Codex:

- artifact loads on CPU;
- output shape matches expected class space;
- values are finite and score scale is not collapsed;
- taxonomy/label order is explicit;
- same-label-space variants have readable top-5 predictions and reasonable overlap with TensorFlow;
- 30-second CPU timing is measured with XAI off, 0.3, and 0.1.

The BirdCLEF 2026 distilled ONNX model remains an external baseline unless identical Perch label space is proven.
