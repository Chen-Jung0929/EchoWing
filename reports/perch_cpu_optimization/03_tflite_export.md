# Perch v2 CPU TFLite Export

## Results

- **FP32**: SUCCESS: 388.48 MB; 4 outputs; minimal inference 1.326 s
- **Dynamic range INT8**: SUCCESS: 358.93 MB; 4 outputs; minimal inference 1.151 s
- **FP16**: SUCCESS: 194.51 MB; 4 outputs; minimal inference 1.960 s

## Full INT8

Not attempted: no representative biological calibration audio is currently available, and dynamic-range INT8 is the bounded practical route requested.

## Observed Compatibility

The SavedModel contains `XlaCallModule`, but TensorFlow 2.20's TFLite converter successfully lowered it in this test. This does not imply that `tf2onnx` can lower the same wrapper.
