import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="TRIAGELENS_",
        env_file=".env",
        extra="ignore",
    )

    # Removed strict literal to allow dynamic model routing
    inference_backend: str = "perch" # Default
    
    # Model Paths (layout: models/perch | models/birdnet | models/silic | ONNX at models root)
    perch_savedmodel_path: Path = Path("models/perch/perch_v2_cpu_savedmodel")
    perch_pseudo_head_path: Path = Path("models/perch/pseudo_best_model.pt")
    perch_labels_path: Path = Path("models/perch/perch_v2_cpu_savedmodel/assets/labels.csv")
    taxonomy_csv_path: Path = Path("models/perch/species_info_completed_comma.csv")

    birdnet_model_path: Path = Path("models/birdnet/audio-model.tflite")
    birdnet_labels_path: Path = Path("models/birdnet/labels/zh.txt")

    silic_model_path: Path = Path("models/silic/silic_best_model.pt")
    silic_taxonomy_csv_path: Path = Path("models/silic/silic_taxonomy.csv")

    onnx_model_path: Path = Path("models/resnet18_v3_int8.onnx")
    class_order_json_path: Path | None = None
    val_line_json_path: Path = Path("models/val_line.json")

    sample_rate: int = 32_000 # Standard resampling rate
    chunk_duration_sec: int = 5 # Default max chunk. Will be adapted per model.
    batch_size: int = 16
    num_threads: int = min(4, os.cpu_count() or 1)

    species_output_index: int = 1
    attention_output_index: int = 2
    onnx_input_name: str | None = None

    max_chunks: int = 120 # Allow more chunks since we might upload 60s
    max_body_mb: int = 50
    max_concurrent_predictions: int = 2
    response_top_k: int = 5
    confidence_threshold: float = 0.5

    # XAI
    enable_xai: bool = True
    xai_window_sec: float = 0.25 # 250ms occlusion window

    # Skip dummy inference at startup (saves a few seconds on HF / demo deploy).
    skip_preflight: bool = False
    # Start loading models in background when the process starts.
    eager_warmup: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()


def chunk_samples(settings: Settings) -> int:
    return settings.sample_rate * settings.chunk_duration_sec
