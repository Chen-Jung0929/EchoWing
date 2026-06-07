from __future__ import annotations

import argparse
from pathlib import Path

from common import REPORTS, file_size_mb, setup_paths, write_markdown


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, help="Downloaded BirdCLEF 2026 distilled ONNX artifact.")
    args = parser.parse_args()
    setup_paths()
    findings = [
        "The notebook title identifies this as a Pantanal/BirdCLEF 2026 distilled ONNX student, not a direct Perch SavedModel conversion.",
        "Treat its output space as BirdCLEF-specific until the notebook artifact and class mapping prove otherwise.",
        "It must be named `birdclef2026_distill_onnx`; it must not be presented as Perch ONNX.",
        "Do not reuse EchoWing's 14,795 Perch taxonomy unless output shape and label order are explicitly verified.",
    ]
    artifact_section = "No local artifact supplied; speed and tensor metadata were not benchmarked."
    if args.model and args.model.is_file():
        try:
            import onnxruntime as ort

            session = ort.InferenceSession(str(args.model), providers=["CPUExecutionProvider"])
            artifact_section = (
                f"- Path: `{args.model}`\n- Size: {file_size_mb(args.model):.2f} MB\n"
                f"- Inputs: `{[(x.name, x.shape, x.type) for x in session.get_inputs()]}`\n"
                f"- Outputs: `{[(x.name, x.shape, x.type) for x in session.get_outputs()]}`\n"
                "- Label mapping remains required before any EchoWing integration or output comparison."
            )
        except Exception as exc:
            artifact_section = f"Artifact inspection failed: `{exc}`"
    write_markdown(
        REPORTS / "07_kaggle_distilled_onnx_review.md",
        "Kaggle Pantanal BirdCLEF 2026 Distilled ONNX Review",
        [
            ("Safety Classification", "**Experimental external baseline only.**"),
            ("Findings", "\n".join(f"- {x}" for x in findings)),
            ("Artifact Status", artifact_section),
            ("Source", "https://www.kaggle.com/code/dingjiarun/pantanal-distill-birdclef2026-onnx"),
        ],
    )


if __name__ == "__main__":
    main()
