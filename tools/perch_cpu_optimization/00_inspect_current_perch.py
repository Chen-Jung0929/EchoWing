from __future__ import annotations

import platform
import time

import numpy as np

from common import BACKEND, REPORTS, SAVED_MODEL, file_size_mb, load_labels, setup_paths, write_json, write_markdown


def main() -> None:
    setup_paths()
    import tensorflow as tf

    started = time.perf_counter()
    model = tf.saved_model.load(str(SAVED_MODEL))
    load_seconds = time.perf_counter() - started
    signature = model.signatures["serving_default"]
    probe = np.zeros((1, 160_000), dtype=np.float32)
    started = time.perf_counter()
    outputs = signature(inputs=tf.constant(probe))
    inference_seconds = time.perf_counter() - started

    payload = {
        "model_path": str(SAVED_MODEL),
        "model_size_mb": round(file_size_mb(SAVED_MODEL), 3),
        "load_seconds": load_seconds,
        "first_zero_inference_seconds": inference_seconds,
        "signatures": list(model.signatures.keys()),
        "structured_input_signature": str(signature.structured_input_signature),
        "outputs": {
            key: {
                "shape": list(value.shape),
                "dtype": value.dtype.name,
                "min": float(tf.reduce_min(value)),
                "max": float(tf.reduce_max(value)),
            }
            for key, value in outputs.items()
        },
        "labels_count": len(load_labels()),
        "echowing_preprocessing": {
            "sample_rate_hz": 32_000,
            "window_seconds": 5,
            "input_shape": ["batch", 160_000],
            "external_perch_frontend": False,
            "note": "EchoWing resamples/segments waveform; SavedModel produces its own spectrogram.",
        },
        "echowing_output_mapping": {
            "species_score_preference": ["logits", "label"],
            "current_resolved_key": "label" if "label" in outputs else "unknown",
            "scores_are_sigmoid_normalized_by_predictor": True,
            "embedding_currently_returned_to_api": False,
        },
        "environment": {
            "python": platform.python_version(),
            "tensorflow": tf.__version__,
            "platform": platform.platform(),
        },
        "source_files": [
            str(BACKEND / "app" / "perch_inference.py"),
            str(BACKEND / "app" / "config.py"),
            str(BACKEND / "app" / "xai.py"),
        ],
    }
    write_json(REPORTS / "00_current_perch_inspection.json", payload)
    outputs_md = "\n".join(
        f"- `{key}`: `{item['shape']}` `{item['dtype']}`, range {item['min']:.4g} to {item['max']:.4g}"
        for key, item in payload["outputs"].items()
    )
    write_markdown(
        REPORTS / "00_current_perch_inspection.md",
        "Current EchoWing Perch Inspection",
        [
            ("Summary", f"- Path: `{SAVED_MODEL}`\n- Size: {payload['model_size_mb']:.2f} MB\n- Load: {load_seconds:.3f} s\n- First zero inference: {inference_seconds:.3f} s"),
            ("Input", "`float32 [batch, 160000]`: 5-second mono waveform at 32 kHz. EchoWing performs decoding/resampling/windowing; the Perch PCEN/mel frontend is inside the SavedModel."),
            ("Outputs", outputs_md),
            ("EchoWing Mapping", "The active predictor chooses `logits` then `label`; this model resolves to `label` with 14,795 values and applies sigmoid when scores are outside 0..1."),
        ],
    )


if __name__ == "__main__":
    main()
