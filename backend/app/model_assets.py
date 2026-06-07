"""Validate and optionally bootstrap model files for HF Docker builds (no .git → no LFS smudge)."""

from __future__ import annotations

import logging
import tempfile
import urllib.request
import zipfile
from pathlib import Path

logger = logging.getLogger(__name__)

# Official BirdNET v2.4 FP32 TFLite (birdnet PyPI package uses the same archive).
BIRDNET_TFLITE_ZIP_URL = (
    "https://zenodo.org/records/15050749/files/BirdNET_v2.4_tflite.zip?download=1"
)
BIRDNET_TFLITE_ZIP_MEMBER = "audio-model.tflite"
BIRDNET_TFLITE_MIN_BYTES = 40_000_000


def is_lfs_pointer(path: Path) -> bool:
    if not path.is_file():
        return False
    head = path.read_bytes()[:64]
    return head.startswith(b"version https://git-lfs.github.com/spec/v1") or head.startswith(
        b"version "
    )


def validate_tflite_file(path: Path, *, label: str) -> None:
    if not path.is_file():
        raise FileNotFoundError(f"{label} not found: {path}")
    if is_lfs_pointer(path):
        raise ValueError(
            f"{label} at {path} is a Git LFS pointer, not a TFLite binary. "
            "Run `git lfs pull` locally, or redeploy after bootstrap_hf_models.py runs in Docker."
        )
    head = path.read_bytes()[:8]
    if len(head) < 8 or head[4:8] != b"TFL3":
        raise ValueError(f"{label} at {path} is not a valid TFLite file (expected TFL3 header).")


def validate_labels_file(path: Path, *, min_lines: int = 1000) -> None:
    if not path.is_file():
        raise FileNotFoundError(f"Labels file not found: {path}")
    if is_lfs_pointer(path):
        raise ValueError(f"Labels file at {path} is a Git LFS pointer, not label text.")
    line_count = sum(1 for line in path.read_text(encoding="utf-8").splitlines() if line.strip())
    if line_count < min_lines:
        raise ValueError(
            f"Labels file at {path} has only {line_count} lines (expected at least {min_lines})."
        )


def _download_file(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Downloading %s → %s", url, dest)
    tmp = dest.with_suffix(dest.suffix + ".partial")
    try:
        with urllib.request.urlopen(url, timeout=600) as resp, tmp.open("wb") as out:
            while True:
                chunk = resp.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)
        tmp.replace(dest)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise


def _download_birdnet_tflite(dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    logger.info(
        "Downloading BirdNET v2.4 TFLite zip from Zenodo → extract %s → %s",
        BIRDNET_TFLITE_ZIP_MEMBER,
        dest,
    )
    with tempfile.TemporaryDirectory(prefix="birdnet_download_") as tmpdir:
        zip_path = Path(tmpdir) / "BirdNET_v2.4_tflite.zip"
        _download_file(BIRDNET_TFLITE_ZIP_URL, zip_path)
        with zipfile.ZipFile(zip_path) as archive:
            if BIRDNET_TFLITE_ZIP_MEMBER not in archive.namelist():
                members = [name for name in archive.namelist() if name.endswith(".tflite")]
                raise ValueError(
                    f"Zenodo archive missing {BIRDNET_TFLITE_ZIP_MEMBER!r}; "
                    f"found tflite files: {members or '(none)'}"
                )
            extracted = Path(tmpdir) / BIRDNET_TFLITE_ZIP_MEMBER
            archive.extract(BIRDNET_TFLITE_ZIP_MEMBER, tmpdir)
        extracted.replace(dest)


def ensure_birdnet_model(path: Path) -> None:
    try:
        validate_tflite_file(path, label="BirdNET model")
        if path.stat().st_size < BIRDNET_TFLITE_MIN_BYTES:
            raise ValueError(f"BirdNET model at {path} is too small ({path.stat().st_size} bytes).")
        return
    except (FileNotFoundError, ValueError) as exc:
        logger.warning("BirdNET model invalid (%s); downloading from Zenodo…", exc)
    _download_birdnet_tflite(path)
    validate_tflite_file(path, label="BirdNET model")


def ensure_perch_tflite(path: Path) -> None:
    validate_tflite_file(path, label="Perch TFLite model")
    if path.stat().st_size < 100_000_000:
        raise ValueError(f"Perch TFLite at {path} is too small ({path.stat().st_size} bytes).")


def resolve_perch_labels_path(
    primary: Path,
    *,
    fallback_paths: tuple[Path, ...] = (),
) -> Path:
    candidates = (primary, *fallback_paths)
    last_error: Exception | None = None
    for path in candidates:
        if not path.is_file():
            continue
        try:
            validate_labels_file(path, min_lines=1000)
            return path
        except ValueError as exc:
            last_error = exc
            logger.warning("Skipping labels candidate %s: %s", path, exc)
    if last_error:
        raise last_error
    raise FileNotFoundError(
        f"No valid Perch labels file found (checked: {', '.join(str(p) for p in candidates)})"
    )


def bootstrap_deploy_models(
    *,
    birdnet_model: Path,
    perch_tflite: Path,
    perch_labels: Path,
    perch_labels_fallbacks: tuple[Path, ...] = (),
) -> None:
    """Called from Docker build to fix missing/LFS-pointer assets before runtime."""
    ensure_birdnet_model(birdnet_model)
    ensure_perch_tflite(perch_tflite)
    resolved = resolve_perch_labels_path(perch_labels, fallback_paths=perch_labels_fallbacks)
    logger.info("Perch labels OK: %s", resolved)
