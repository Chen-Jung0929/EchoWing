import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="TRIAGELENS_",
        env_file=".env",
        extra="ignore",
    )

    onnx_model_path: Path = Path("models/resnet18_v3_int8.onnx")
    taxonomy_csv_path: Path = Path("models/taxonomy.csv")
    class_order_json_path: Path | None = None
    val_line_json_path: Path = Path("models/val_line.json")

    sample_rate: int = 32_000
    chunk_duration_sec: int = 5
    batch_size: int = 16
    num_threads: int = min(4, os.cpu_count() or 1)

    species_output_index: int = 1
    onnx_input_name: str | None = None

    max_chunks: int = 24
    max_body_mb: int = 50
    max_concurrent_predictions: int = 2
    response_top_k: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()


def chunk_samples(settings: Settings) -> int:
    return settings.sample_rate * settings.chunk_duration_sec
