"""
API response contract for POST /api/predict (aligned with frontend mock_data/perch_result.json).

Each chunk entry matches a single perch_result object (without status / chunk_duration):
- analysis_id
- predictions: top_species, top_classes, attention_weights
- decision_support (optional)
- error: set when decode fails
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ZhAndEn(BaseModel):
    zh: str
    en: str


class TopSpecies(BaseModel):
    species_id: str
    name: ZhAndEn
    probability: float


class TopClass(BaseModel):
    class_name: ZhAndEn
    probability: float


class Prediction(BaseModel):
    top_species: list[TopSpecies]
    top_classes: list[TopClass]
    attention_weights: list[float] | None = None


class DecisionSupport(BaseModel):
    risk_analysis: ZhAndEn
    action_recommendation: ZhAndEn
    disclaimer: ZhAndEn


class ChunkPrediction(BaseModel):
    index: int
    analysis_id: str
    predictions: Prediction | None = None
    decision_support: DecisionSupport | None = None
    error: str | None = None


class PredictResponse(BaseModel):
    chunks: list[ChunkPrediction]
    original_filename: str = ""
    warnings: list[str] = Field(default_factory=list)


class ErrorBody(BaseModel):
    message: str
    detail: Any | None = None
