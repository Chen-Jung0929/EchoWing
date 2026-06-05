"""Sanity checks for BirdNET logit → confidence calibration."""

from __future__ import annotations

import numpy as np

from app.birdnet_inference import logit_from_score, logits_to_birdnet_confidence


def _legacy_naive_sigmoid(logits: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-logits))


def test_anchor_maps_legacy_015_to_calibrated_05() -> None:
    anchor = 0.15
    logit = logit_from_score(anchor)
    legacy = float(_legacy_naive_sigmoid(np.array([logit]))[0])
    calibrated = float(
        logits_to_birdnet_confidence(
            np.array([logit]),
            sensitivity=1.0,
            legacy_score_anchor=anchor,
        )[0]
    )
    assert abs(legacy - anchor) < 1e-5
    assert abs(calibrated - 0.5) < 1e-5


def test_higher_logit_yields_higher_confidence() -> None:
    anchor = 0.15
    logit_low = logit_from_score(anchor)
    logit_high = 0.0
    conf = logits_to_birdnet_confidence(
        np.array([logit_low, logit_high]),
        sensitivity=1.0,
        legacy_score_anchor=anchor,
    )
    assert conf[1] > conf[0]


if __name__ == "__main__":
    test_anchor_maps_legacy_015_to_calibrated_05()
    test_higher_logit_yields_higher_confidence()
    print("birdnet score calibration OK")
