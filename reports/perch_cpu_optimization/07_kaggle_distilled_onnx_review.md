# Kaggle Pantanal BirdCLEF 2026 Distilled ONNX Review

## Safety Classification

**Experimental external baseline only.**

## Findings

- The notebook title identifies this as a Pantanal/BirdCLEF 2026 distilled ONNX student, not a direct Perch SavedModel conversion.
- Treat its output space as BirdCLEF-specific until the notebook artifact and class mapping prove otherwise.
- It must be named `birdclef2026_distill_onnx`; it must not be presented as Perch ONNX.
- Do not reuse EchoWing's 14,795 Perch taxonomy unless output shape and label order are explicitly verified.

## Artifact Status

No local artifact supplied; speed and tensor metadata were not benchmarked.

## Source

https://www.kaggle.com/code/dingjiarun/pantanal-distill-birdclef2026-onnx
