from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

from common import ARTIFACTS, REPORTS, SAVED_MODEL, file_size_mb, setup_paths, write_markdown


def compact_error(text: str) -> str:
    useful = [line for line in text.splitlines() if "ERROR" in line or "ValueError" in line or "XlaCallModule" in line]
    return "\n".join(useful[-20:]) or text[-4000:]


def validate(path: Path) -> str:
    import numpy as np
    import onnx
    import onnxruntime as ort

    onnx.checker.check_model(str(path))
    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    inp = session.get_inputs()[0]
    started = time.perf_counter()
    outputs = session.run(None, {inp.name: np.zeros((1, 160_000), dtype=np.float32)})
    return f"ONNX checker passed; minimal inference returned {len(outputs)} outputs in {time.perf_counter() - started:.3f} s."


def main() -> None:
    setup_paths()
    target = ARTIFACTS / "perch_v2_cpu_fp32.onnx"
    attempts: list[str] = []
    success = False
    validation = "Not run."
    for opset in (17, 16, 15):
        if target.exists():
            target.unlink()
        cmd = [
            sys.executable,
            "-m",
            "tf2onnx.convert",
            "--saved-model",
            str(SAVED_MODEL),
            "--signature_def",
            "serving_default",
            "--opset",
            str(opset),
            "--output",
            str(target),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        attempts.append(f"### Opset {opset}\n\n- Exit code: `{proc.returncode}`\n- Error excerpt:\n\n```text\n{compact_error(proc.stdout + proc.stderr)}\n```")
        if proc.returncode == 0 and target.is_file():
            try:
                validation = validate(target)
                success = True
                break
            except Exception as exc:
                validation = f"Validation failed: {exc}"
    status = "SUCCESS" if success else "BLOCKED"
    reason = validation if success else "The Kaggle Perch v2 CPU SavedModel wraps the JAX graph in TensorFlow `XlaCallModule`. tf2onnx cannot lower this StableHLO/XLA module to standard ONNX operators."
    write_markdown(
        REPORTS / "01_onnx_export.md",
        "Perch v2 CPU ONNX FP32 Export",
        [
            ("Result", f"**{status}**\n\n{reason}"),
            ("Artifact", f"`{target}` ({file_size_mb(target):.2f} MB)" if target.exists() else "No valid ONNX artifact was produced."),
            ("Attempts", "\n\n".join(attempts)),
            ("Engineering Conclusion", "Changing only the ONNX opset does not solve `XlaCallModule`. A real ONNX export would need the original JAX/Flax parameters plus a supported JAX-to-ONNX path, or a separately published ONNX artifact."),
        ],
    )
    if not success and target.exists():
        target.unlink()


if __name__ == "__main__":
    main()
