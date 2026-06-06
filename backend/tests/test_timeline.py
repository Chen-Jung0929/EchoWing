"""Unit tests for timeline deconvolution."""

from __future__ import annotations

import numpy as np

from app.schemas import Prediction, TopSpecies, ZhAndEn
from app.timeline import (
    EvidenceAccumulator,
    build_coverage_matrix,
    build_timeline_deconv_payload,
    sparse_deconvolve,
)


def _species(sid: str, prob: float) -> TopSpecies:
    return TopSpecies(
        species_id=sid,
        name=ZhAndEn(zh=sid, en=sid),
        probability=prob,
    )


def test_coverage_matrix_shape_and_counts():
    starts = [0, 1, 2, 3, 4, 5]
    a, coverage = build_coverage_matrix(starts, window_sec=5, duration_sec=10.0)
    assert a.shape == (6, 10)
    assert coverage[0] == 1.0
    assert coverage[4] == 5.0
    assert coverage[9] == 1.0


def test_sparse_deconvolve_single_peak():
    starts = list(range(6))
    a, _ = build_coverage_matrix(starts, window_sec=5, duration_sec=10.0)
    x_true = np.zeros(10)
    x_true[3] = 1.0
    y = a @ x_true
    x_hat = sparse_deconvolve(a, y, lam=0.01)
    assert x_hat.argmax() == 3
    assert x_hat[3] > 0.5


def test_sparse_deconvolve_zero_observation():
    starts = [0, 1, 2]
    a, _ = build_coverage_matrix(starts, window_sec=3, duration_sec=5.0)
    y = np.zeros(3)
    x_hat = sparse_deconvolve(a, y)
    assert np.all(x_hat >= 0)
    assert float(x_hat.sum()) < 1e-6


def test_evidence_accumulator_and_payload():
    acc = EvidenceAccumulator()
    acc.add_window(
        0,
        Prediction(
            top_species=[_species("sp_a", 0.8)],
            top_classes=[],
            reference_species=[_species("sp_b", 0.2)],
        ),
    )
    acc.add_window(
        1,
        Prediction(
            top_species=[_species("sp_a", 0.6)],
            top_classes=[],
            reference_species=[],
        ),
    )

    payload = build_timeline_deconv_payload(
        acc,
        duration_sec=5.0,
        window_sec=3,
        stride_sec=1,
    )
    assert payload.event == "timeline_deconv"
    assert len(payload.window_starts) == 2
    assert len(payload.species_curves) == 2
    ids = {c.species_id for c in payload.species_curves}
    assert ids == {"sp_a", "sp_b"}
