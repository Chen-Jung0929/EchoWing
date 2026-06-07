from __future__ import annotations

from pathlib import Path

import numpy as np
import torch

from common import ARTIFACTS, BACKEND, load_labels, setup_paths


def _sigmoid_if_needed(values: np.ndarray) -> np.ndarray:
    values = np.asarray(values, dtype=np.float32)
    if values.min() < 0.0 or values.max() > 1.0:
        values = 1.0 / (1.0 + np.exp(-values))
    return np.clip(np.nan_to_num(values, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0)


class OnnxPerchPredictor:
    uses_baseline = False

    def __init__(self, model_path: Path, num_threads: int = 2):
        import onnxruntime as ort

        self.labels = load_labels()
        self.device = torch.device("cpu")
        options = ort.SessionOptions()
        options.intra_op_num_threads = num_threads
        options.inter_op_num_threads = 1
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        self.session = ort.InferenceSession(str(model_path), options, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        outputs = self.session.get_outputs()
        self.score_index = next(
            (i for i, out in enumerate(outputs) if out.shape and out.shape[-1] == len(self.labels)),
            None,
        )
        if self.score_index is None:
            raise ValueError("No ONNX output matches Perch label count")

    def predict_waveform_batch(self, chunks: torch.Tensor):
        waveforms = chunks.squeeze(1).detach().cpu().numpy().astype(np.float32, copy=False)
        outputs = self.session.run(None, {self.input_name: waveforms})
        return _sigmoid_if_needed(outputs[self.score_index]), None


class TFLitePerchPredictor:
    uses_baseline = False

    def __init__(self, model_path: Path, num_threads: int = 2, batch_size: int = 16):
        import tensorflow as tf

        self.labels = load_labels()
        self.device = torch.device("cpu")
        self.batch_size = max(1, batch_size)
        self.interpreter = tf.lite.Interpreter(model_path=str(model_path), num_threads=num_threads)
        self.interpreter.allocate_tensors()
        self.score_index = next(
            (
                out["index"]
                for out in self.interpreter.get_output_details()
                if out["shape_signature"][-1] == len(self.labels)
            ),
            None,
        )
        if self.score_index is None:
            raise ValueError("No TFLite output matches Perch label count")

    def predict_waveform_batch(self, chunks: torch.Tensor):
        waveforms = chunks.squeeze(1).detach().cpu().numpy().astype(np.float32, copy=False)
        parts = []
        for start in range(0, len(waveforms), self.batch_size):
            batch = waveforms[start : start + self.batch_size]
            inp = self.interpreter.get_input_details()[0]
            self.interpreter.resize_tensor_input(inp["index"], batch.shape, strict=False)
            self.interpreter.allocate_tensors()
            inp = self.interpreter.get_input_details()[0]
            self.interpreter.set_tensor(inp["index"], batch.astype(inp["dtype"], copy=False))
            self.interpreter.invoke()
            parts.append(self.interpreter.get_tensor(self.score_index).copy())
        return _sigmoid_if_needed(np.concatenate(parts, axis=0)), None


def available_runtimes() -> dict[str, Path | None]:
    return {
        "tf": BACKEND / "models" / "perch" / "perch_v2_cpu_savedmodel",
        "onnx": ARTIFACTS / "perch_v2_cpu_fp32.onnx",
        "onnx_int8": ARTIFACTS / "perch_v2_cpu_dynamic_int8.onnx",
        "tflite": ARTIFACTS / "perch_v2_cpu_fp32.tflite",
        "tflite_int8": ARTIFACTS / "perch_v2_cpu_dynamic_int8.tflite",
    }


def create_predictor(runtime: str, num_threads: int = 2):
    setup_paths()
    path = available_runtimes()[runtime]
    if path is None or not path.exists():
        raise FileNotFoundError(f"{runtime} artifact is unavailable: {path}")
    if runtime == "tf":
        from app.config import Settings
        from app.perch_inference import PerchChunkPredictor

        return PerchChunkPredictor(
            Settings(
                num_threads=num_threads,
                batch_size=16,
                xai_parallel=1,
                inference_batch_parallel=1,
                skip_preflight=True,
                perch_savedmodel_path=path,
                perch_labels_path=path / "assets" / "labels.csv",
            )
        )
    if runtime.startswith("onnx"):
        return OnnxPerchPredictor(path, num_threads)
    return TFLitePerchPredictor(path, num_threads)
