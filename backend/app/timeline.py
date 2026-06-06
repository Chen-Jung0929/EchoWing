"""Sparse non-negative deconvolution for per-species latent activity timelines."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from app.schemas import Prediction, TimelineDeconvPayload, TimelineSpeciesCurve, ZhAndEn

DECONV_LAMBDA = 0.05
FISTA_MAX_ITER = 200


@dataclass
class SpeciesRecord:
    species_id: str
    name: ZhAndEn
    scientific_name: str = ""


@dataclass
class EvidenceAccumulator:
    """Collect per-window top-k evidence for union-of-species deconvolution."""

    window_starts: list[int] = field(default_factory=list)
    _species: dict[str, SpeciesRecord] = field(default_factory=dict)
    _evidence: dict[str, list[float]] = field(default_factory=dict)

    def add_window(self, start_sec: int, predictions: Prediction | None) -> None:
        self.window_starts.append(start_sec)
        observed: dict[str, float] = {}
        if predictions:
            seen: set[str] = set()
            for sp in predictions.top_species + predictions.reference_species:
                if sp.species_id in seen:
                    continue
                seen.add(sp.species_id)
                observed[sp.species_id] = sp.probability
                if sp.species_id not in self._species:
                    self._species[sp.species_id] = SpeciesRecord(
                        species_id=sp.species_id,
                        name=sp.name,
                        scientific_name=sp.scientific_name,
                    )

        window_idx = len(self.window_starts) - 1
        for sid in set(self._evidence.keys()) | set(observed.keys()):
            if sid not in self._evidence:
                self._evidence[sid] = [0.0] * window_idx
            elif len(self._evidence[sid]) < window_idx:
                pad = window_idx - len(self._evidence[sid])
                self._evidence[sid].extend([0.0] * pad)
            self._evidence[sid].append(observed.get(sid, 0.0))


def build_coverage_matrix(
    window_starts: list[int],
    window_sec: int,
    duration_sec: float,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Build window coverage matrix A (num_windows, T) and per-second coverage counts.

    A[i, t] = 1 when window i (starting at window_starts[i]) covers second t.
    """
    t_bins = max(1, int(np.ceil(duration_sec)))
    num_windows = len(window_starts)
    a = np.zeros((num_windows, t_bins), dtype=np.float64)
    for i, start in enumerate(window_starts):
        for t in range(start, min(start + window_sec, t_bins)):
            a[i, t] = 1.0
    coverage = a.sum(axis=0)
    return a, coverage


def _soft_threshold_nonneg(v: np.ndarray, thresh: float) -> np.ndarray:
    return np.maximum(v - thresh, 0.0)


def sparse_deconvolve(
    a: np.ndarray,
    y: np.ndarray,
    *,
    lam: float = DECONV_LAMBDA,
    max_iter: int = FISTA_MAX_ITER,
) -> np.ndarray:
    """
    Solve min_x 0.5||Ax - y||^2 + lam||x||_1 s.t. x >= 0 via FISTA.
    """
    y = np.asarray(y, dtype=np.float64).reshape(-1)
    m, n = a.shape
    if m == 0 or n == 0:
        return np.zeros(n, dtype=np.float64)

    ata = a.T @ a
    aty = a.T @ y
    lipschitz = float(np.linalg.norm(ata, ord=2))
    if lipschitz <= 0:
        return np.zeros(n, dtype=np.float64)
    step = 1.0 / lipschitz
    prox_thresh = lam * step

    x = np.zeros(n, dtype=np.float64)
    y_fista = x.copy()
    t = 1.0

    for _ in range(max_iter):
        grad = ata @ y_fista - aty
        x_new = _soft_threshold_nonneg(y_fista - step * grad, prox_thresh)
        t_new = 0.5 * (1.0 + np.sqrt(1.0 + 4.0 * t * t))
        y_fista = x_new + ((t - 1.0) / t_new) * (x_new - x)
        t = t_new
        x = x_new

    return x


def build_timeline_deconv_payload(
    accumulator: EvidenceAccumulator,
    *,
    duration_sec: float,
    window_sec: int,
    stride_sec: int,
    lam: float = DECONV_LAMBDA,
) -> TimelineDeconvPayload:
    """Run deconvolution for all accumulated species and package the SSE payload."""
    window_starts = accumulator.window_starts
    if not window_starts:
        t_bins = max(1, int(np.ceil(duration_sec)))
        return TimelineDeconvPayload(
            duration_sec=duration_sec,
            window_sec=window_sec,
            stride_sec=stride_sec,
            window_starts=[],
            coverage=[0.0] * t_bins,
            boundary_low_sec=max(0, window_sec - 1),
            species_curves=[],
        )

    a, coverage = build_coverage_matrix(window_starts, window_sec, duration_sec)
    t_bins = a.shape[1]
    species_curves: list[TimelineSpeciesCurve] = []

    for sid, y_list in accumulator._evidence.items():
        meta = accumulator._species.get(sid)
        if meta is None:
            continue
        y = np.asarray(y_list, dtype=np.float64)
        if y.size != a.shape[0]:
            pad = a.shape[0] - y.size
            if pad > 0:
                y = np.pad(y, (0, pad))
            else:
                y = y[: a.shape[0]]

        latent = sparse_deconvolve(a, y, lam=lam)
        species_curves.append(
            TimelineSpeciesCurve(
                species_id=sid,
                name=meta.name,
                scientific_name=meta.scientific_name,
                observed_evidence=[float(v) for v in y],
                latent_activity=[float(v) for v in latent],
            )
        )

    species_curves.sort(
        key=lambda c: max(c.latent_activity) if c.latent_activity else 0.0,
        reverse=True,
    )

    return TimelineDeconvPayload(
        duration_sec=duration_sec,
        window_sec=window_sec,
        stride_sec=stride_sec,
        window_starts=list(window_starts),
        coverage=[float(v) for v in coverage],
        boundary_low_sec=max(0, window_sec - 1),
        species_curves=species_curves,
    )
