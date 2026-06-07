from __future__ import annotations

import time

import numpy as np
import onnx
import onnxruntime as ort
from onnxruntime.quantization import QuantType, quantize_dynamic

from common import ARTIFACTS, REPORTS, file_size_mb, setup_paths, write_markdown


def main() -> None:
    setup_paths()
    source = ARTIFACTS / "perch_v2_cpu_fp32.onnx"
    target = ARTIFACTS / "perch_v2_cpu_dynamic_int8.onnx"
    if not source.is_file():
        write_markdown(
            REPORTS / "02_onnx_int8_quantization.md",
            "Perch v2 CPU ONNX Dynamic INT8 Quantization",
            [("Result", "**BLOCKED**: FP32 ONNX source is unavailable. Run `01_export_perch_onnx.py`; its report documents the current `XlaCallModule` blocker.")],
        )
        return
    try:
        quantize_dynamic(str(source), str(target), weight_type=QuantType.QInt8)
        onnx.checker.check_model(str(target))
        session = ort.InferenceSession(str(target), providers=["CPUExecutionProvider"])
        inp = session.get_inputs()[0]
        started = time.perf_counter()
        outputs = session.run(None, {inp.name: np.zeros((1, 160_000), dtype=np.float32)})
        body = (
            f"**SUCCESS**\n\n- FP32: {file_size_mb(source):.2f} MB\n"
            f"- INT8: {file_size_mb(target):.2f} MB\n- Outputs: {len(outputs)}\n"
            f"- Minimal inference: {time.perf_counter() - started:.3f} s"
        )
    except Exception as exc:
        target.unlink(missing_ok=True)
        body = f"**FAILED**\n\n```text\n{exc}\n```"
    write_markdown(REPORTS / "02_onnx_int8_quantization.md", "Perch v2 CPU ONNX Dynamic INT8 Quantization", [("Result", body)])


if __name__ == "__main__":
    main()
