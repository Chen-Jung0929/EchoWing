"""Ensure HF Docker image has real model binaries (not Git LFS pointer text files)."""

from __future__ import annotations

import logging
from pathlib import Path

from app.config import get_settings
from app.model_assets import bootstrap_deploy_models

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


def main() -> int:
    settings = get_settings()
    bootstrap_deploy_models(
        birdnet_model=settings.birdnet_model_path,
        perch_tflite=settings.perch_tflite_path,
        perch_labels=settings.perch_labels_path,
        perch_labels_fallbacks=(
            Path("models/perch/labels.csv"),
            settings.perch_savedmodel_path / "assets" / "labels.csv",
        ),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
