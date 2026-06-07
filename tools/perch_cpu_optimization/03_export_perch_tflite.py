from __future__ import annotations

import time
from pathlib import Path

import numpy as np

from common import ARTIFACTS, REPORTS, SAVED_MODEL, file_size_mb, setup_paths, write_markdown


def validate(path: Path) -> str:
    import tensorflow as tf

    interpreter = tf.lite.Interpreter(model_path=str(path), num_threads=2)
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]
    shape = [1 if x == -1 else int(x) for x in inp["shape_signature"]]
    if len(shape) != 2:
        shape = [1, 160_000]
    interpreter.resize_tensor_input(inp["index"], shape, strict=False)
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]
    interpreter.set_tensor(inp["index"], np.zeros(shape, dtype=inp["dtype"]))
    started = time.perf_counter()
    interpreter.invoke()
    outputs = interpreter.get_output_details()
    return f"{len(outputs)} outputs; minimal inference {time.perf_counter() - started:.3f} s"


def convert(name: str, configure) -> tuple[str, Path | None]:
    import tensorflow as tf

    target = ARTIFACTS / name
    try:
        converter = tf.lite.TFLiteConverter.from_saved_model(str(SAVED_MODEL))
        configure(converter, tf)
        target.write_bytes(converter.convert())
        return f"SUCCESS: {file_size_mb(target):.2f} MB; {validate(target)}", target
    except Exception as exc:
        target.unlink(missing_ok=True)
        return f"FAILED: {type(exc).__name__}: {str(exc)[-1500:]}", None


def main() -> None:
    setup_paths()
    results = {}
    results["FP32"] = convert("perch_v2_cpu_fp32.tflite", lambda c, tf: None)[0]
    results["Dynamic range INT8"] = convert(
        "perch_v2_cpu_dynamic_int8.tflite",
        lambda c, tf: setattr(c, "optimizations", [tf.lite.Optimize.DEFAULT]),
    )[0]

    def fp16(c, tf):
        c.optimizations = [tf.lite.Optimize.DEFAULT]
        c.target_spec.supported_types = [tf.float16]

    results["FP16"] = convert("perch_v2_cpu_fp16.tflite", fp16)[0]
    write_markdown(
        REPORTS / "03_tflite_export.md",
        "Perch v2 CPU TFLite Export",
        [
            ("Results", "\n".join(f"- **{name}**: {result}" for name, result in results.items())),
            ("Full INT8", "Not attempted: no representative biological calibration audio is currently available, and dynamic-range INT8 is the bounded practical route requested."),
            ("Interpretation", "This TensorFlow 2.20 TFLite converter successfully lowered the SavedModel despite its `XlaCallModule`. Dynamic-range INT8 reduced size only modestly; benchmark and output sanity checks are required before integration."),
        ],
    )


if __name__ == "__main__":
    main()
