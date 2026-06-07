from __future__ import annotations

import csv
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
REPORTS = ROOT / "reports" / "perch_cpu_optimization"
ARTIFACTS = ROOT / "artifacts" / "perch_cpu_optimization"
BENCHMARKS = ROOT / "benchmarks" / "perch_cpu_optimization"
SAVED_MODEL = BACKEND / "models" / "perch" / "perch_v2_cpu_savedmodel"
LABELS = SAVED_MODEL / "assets" / "labels.csv"


def setup_paths() -> None:
    for path in (REPORTS, ARTIFACTS, BENCHMARKS):
        path.mkdir(parents=True, exist_ok=True)
    backend_text = str(BACKEND)
    if backend_text not in sys.path:
        sys.path.insert(0, backend_text)


def file_size_mb(path: Path) -> float:
    if not path.exists():
        return 0.0
    if path.is_file():
        return path.stat().st_size / 1024**2
    return sum(p.stat().st_size for p in path.rglob("*") if p.is_file()) / 1024**2


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def write_markdown(path: Path, title: str, sections: list[tuple[str, str]]) -> None:
    lines = [f"# {title}", ""]
    for heading, body in sections:
        lines.extend([f"## {heading}", "", body.rstrip(), ""])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def load_labels(path: Path = LABELS) -> list[str]:
    lines = [x.strip() for x in path.read_text(encoding="utf-8").splitlines() if x.strip()]
    if lines and lines[0].lower().startswith(("inat", "ebird", "no_ebird")):
        lines = lines[1:]
    return lines


def csv_write(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def first_existing(paths: list[Path]) -> Path | None:
    return next((p for p in paths if p.is_file()), None)
