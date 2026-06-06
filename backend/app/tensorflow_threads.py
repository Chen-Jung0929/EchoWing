"""TensorFlow CPU thread budget (shared across Perch / BirdNET SavedModel paths)."""

from __future__ import annotations

import logging

from app.config import Settings

logger = logging.getLogger(__name__)

_tf_threads_locked = False


def recommended_tf_intra_op_threads(settings: Settings) -> int:
    """Job-level parallelism needs intra_op=1; otherwise use num_threads per call."""
    if settings.inference_batch_parallel > 1 or settings.xai_parallel > 1:
        return 1
    return max(1, settings.num_threads)


def configure_tensorflow_threads(
    settings: Settings,
    *,
    intra_op: int | None = None,
    inter_op: int = 1,
) -> None:
    """Apply TF thread limits once, before the first SavedModel inference."""
    global _tf_threads_locked

    if _tf_threads_locked:
        return

    try:
        import tensorflow as tf
    except ImportError:
        return

    intra = max(1, intra_op if intra_op is not None else recommended_tf_intra_op_threads(settings))
    inter = max(1, inter_op)
    try:
        tf.config.threading.set_intra_op_parallelism_threads(intra)
        tf.config.threading.set_inter_op_parallelism_threads(inter)
        _tf_threads_locked = True
        logger.info("TensorFlow threads intra_op=%s inter_op=%s", intra, inter)
    except RuntimeError as exc:
        # TF context already initialized (e.g. after first predict); cannot change.
        _tf_threads_locked = True
        logger.debug("TensorFlow threads already initialized: %s", exc)
