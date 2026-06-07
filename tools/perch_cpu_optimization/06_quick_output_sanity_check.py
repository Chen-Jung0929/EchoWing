from __future__ import annotations

import numpy as np
import soundfile as sf
import torch

from common import BENCHMARKS, REPORTS, load_labels, setup_paths, write_json, write_markdown
from runtime import available_runtimes, create_predictor


def main() -> None:
    setup_paths()
    audio, sr = sf.read(BENCHMARKS / "synthetic_pipeline_test_30s.wav", dtype="float32")
    chunks = []
    for start in range(0, 30, 5):
        wave = audio[start * sr : (start + 5) * sr]
        chunks.append(torch.from_numpy(wave).reshape(1, -1))
    batch = torch.stack(chunks)
    labels = load_labels()
    results = {}
    baseline_top = None
    for runtime, artifact in available_runtimes().items():
        if artifact is None or not artifact.exists():
            continue
        predictor = create_predictor(runtime)
        probs, _ = predictor.predict_waveform_batch(batch)
        top = np.argsort(probs[0])[-5:][::-1].tolist()
        if runtime == "tf":
            baseline_top = set(top)
        results[runtime] = {
            "shape": list(probs.shape),
            "finite": bool(np.isfinite(probs).all()),
            "min": float(probs.min()),
            "max": float(probs.max()),
            "top5_indices": top,
            "top5_labels": [labels[i] for i in top],
            "top5_overlap_with_tf": None if baseline_top is None else len(set(top) & baseline_top),
        }
    write_json(BENCHMARKS / "quick_output_sanity_check.json", results)
    lines = []
    for runtime, result in results.items():
        lines.append(
            f"- **{runtime}**: shape `{result['shape']}`, finite={result['finite']}, "
            f"range={result['min']:.4g}..{result['max']:.4g}, TF top-5 overlap={result['top5_overlap_with_tf']}; "
            f"top-5: {', '.join(result['top5_labels'])}"
        )
    write_markdown(
        REPORTS / "06_quick_output_sanity_check.md",
        "Perch Optimized Runtime Quick Output Sanity Check",
        [
            ("Result", "\n".join(lines) or "No runnable model variants were found."),
            ("Scope", "This verifies shape, finite values, readable labels, score scale, and top-5 overlap only. Synthetic audio makes this unsuitable as biological accuracy validation."),
        ],
    )


if __name__ == "__main__":
    main()
