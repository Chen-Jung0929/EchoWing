# Perch CPU Optimization Resource Review

## EchoWing Current Runtime

- Source of truth: https://github.com/Chen-Jung0929/EchoWing, cloned from `main` commit `64aeeb7`.
- EchoWing resamples to mono 32 kHz and sends 5-second waveform windows as `float32 [batch, 160000]`.
- Current 30-second flow uses a 1-second inference stride, producing 30 padded/sliding Perch windows. Six 5-second-aligned windows receive spectrogram/XAI work.
- The SavedModel contains the PCEN/melspectrogram frontend. EchoWing does not compute the Perch frontend externally.
- Actual signature outputs:
  - `label [batch, 14795]`: species/taxonomy logits used by EchoWing.
  - `embedding [batch, 1536]`.
  - `spatial_embedding [batch, 16, 4, 1536]`.
  - `spectrogram [batch, 500, 128]`.
- `assets/labels.csv` begins with `inat2024_fsd50k`, then 14,795 class names. `perch_v2_ebird_classes.csv` is a separate eBird 2021 mapping/list and must not silently replace it.
- EchoWing requires TensorFlow CPU 2.20.x for this model. The graph includes `XlaCallModule` and triggers XLA compilation on first inference.

## Google Perch And Kaggle Model

- Google Perch describes its frontend as a PCEN melspectrogram and provides JAX-to-TensorFlow/TFLite export utilities.
- The official export utility says XLA should be disabled during the original JAX-to-TF export for subsequent TFLite conversion. The provided Kaggle `perch_v2_cpu` SavedModel is already an XLA/StableHLO-style export, creating a conversion compatibility risk that must be tested directly.
- Perch-Hoplite is the recommended practical inference wrapper. Its Perch taxonomy model presets confirm 32 kHz, 5-second windows, and `label`/`embedding` outputs.
- Official code supports TensorFlow SavedModel and an original-checkpoint-to-TFLite export path. No official Perch ONNX export path was found; ONNX is a community/engineering route.

## Conversion Implication

- `tf2onnx` cannot lower the model's `XlaCallModule`; opset 17/16/15 changes do not remove that blocker.
- Despite the official export warning, TensorFlow 2.20's TFLite converter successfully lowered this provided SavedModel to FP32, dynamic-range INT8, and FP16 artifacts in the direct engineering test.
- A viable Perch ONNX artifact still likely requires the original Perch v2 JAX/Flax checkpoint and a supported fresh export, or an officially published compatible artifact.

## Kaggle BirdCLEF 2026 Distilled ONNX

- The Pantanal notebook is an external BirdCLEF 2026 distilled student baseline, not a direct Perch conversion.
- Its input preprocessing, class list, and label order must be extracted from the downloadable notebook/artifact before use.
- It must remain named `birdclef2026_distill_onnx` and must not reuse EchoWing's Perch taxonomy unless exact compatibility is proven.

## Sources

- https://github.com/Chen-Jung0929/EchoWing
- https://github.com/google-research/perch
- https://www.kaggle.com/models/google/bird-vocalization-classifier/TensorFlow2/perch_v2_cpu
- https://github.com/google-research/perch-hoplite
- https://www.kaggle.com/code/dingjiarun/pantanal-distill-birdclef2026-onnx
