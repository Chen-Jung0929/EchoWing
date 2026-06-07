# Current EchoWing Perch Inspection

## Summary

- Path: `C:\EchoWing\backend\models\perch\perch_v2_cpu_savedmodel`
- Size: 391.27 MB
- Load: 1.994 s
- First zero inference: 2.928 s

## Input

`float32 [batch, 160000]`: 5-second mono waveform at 32 kHz. EchoWing performs decoding/resampling/windowing; the Perch PCEN/mel frontend is inside the SavedModel.

## Outputs

- `spatial_embedding`: `[1, 16, 4, 1536]` `float32`, range -0.2785 to 2.662
- `spectrogram`: `[1, 500, 128]` `float32`, range -1.151 to -1.151
- `label`: `[1, 14795]` `float32`, range -9.123 to 4.51
- `embedding`: `[1, 1536]` `float32`, range -0.1668 to 0.3305

## EchoWing Mapping

The active predictor chooses `logits` then `label`; this model resolves to `label` with 14,795 values and applies sigmoid when scores are outside 0..1.
