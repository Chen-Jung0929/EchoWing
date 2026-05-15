"""
API response contract for POST /api/predict (see notebooks/api.js).

Response JSON:
- labels: ordered class ids (strings), same order as probs[i] per chunk
- chunks: one entry per uploaded chunk, sorted by chunk index
  - index: chunk order (from filename chunk_<n>.wav when parseable)
  - probs: length len(labels); raw sigmoid minus val_line.json baseline, clipped to [0,1]
  - top_k: convenience list of {label, score} descending (size <= response_top_k)
  - error: null or machine-readable string (e.g. decode_failed)
- original_filename, sample_rate: echo from request
- warnings: optional strings (e.g. filename sort fallback)
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class TopKItem(BaseModel):
    label: str
    score: float


class ChunkPrediction(BaseModel):
    index: int
    probs: list[float] | None = None
    top_k: list[TopKItem] | None = None
    error: str | None = None


class PredictResponse(BaseModel):
    labels: list[str]
    chunks: list[ChunkPrediction]
    original_filename: str = ""
    sample_rate: int = 32_000
    warnings: list[str] = Field(default_factory=list)


class ErrorBody(BaseModel):
    message: str
    detail: Any | None = None
