from __future__ import annotations

import json

import numpy as np
import onnxruntime as ort
import pandas as pd
import torch

from app.audio_mel import AudioToMelSpectrogram
from app.config import Settings, chunk_samples, get_settings


def load_val_line_baseline(settings: Settings) -> np.ndarray:
    path = settings.val_line_json_path
    if not path.is_file():
        raise FileNotFoundError(
            f"val_line.json not found: {path}. Set TRIAGELENS_VAL_LINE_JSON_PATH."
        )
    payload = json.loads(path.read_text(encoding="utf-8"))
    baseline = payload.get("baseline")
    if not isinstance(baseline, list):
        raise ValueError("val_line.json must contain a numeric array under key 'baseline'")
    arr = np.asarray(baseline, dtype=np.float32).reshape(-1)
    if arr.size == 0:
        raise ValueError("val_line.json baseline is empty")
    return np.clip(np.nan_to_num(arr, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0)


def load_labels(settings: Settings) -> list[str]:
    if settings.class_order_json_path and settings.class_order_json_path.is_file():
        data = json.loads(settings.class_order_json_path.read_text(encoding="utf-8"))
        if not isinstance(data, list) or not all(isinstance(x, str) for x in data):
            raise ValueError("class_order_json must be a JSON array of strings")
        return data

    if not settings.taxonomy_csv_path.is_file():
        raise FileNotFoundError(
            f"taxonomy.csv not found: {settings.taxonomy_csv_path}. "
            "Set TRIAGELENS_TAXONOMY_CSV_PATH or TRIAGELENS_CLASS_ORDER_JSON_PATH."
        )
    df = pd.read_csv(settings.taxonomy_csv_path)
    if "primary_label" not in df.columns:
        raise ValueError("taxonomy.csv must contain primary_label column")
    return sorted(df["primary_label"].astype(str).unique().tolist())


class BirdChunkPredictor:
    """Loads ONNX once; runs batched mel + ORT inference for arbitrary N chunks."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.device = torch.device("cpu")
        self.labels = load_labels(self.settings)
        onnx_path = self.settings.onnx_model_path
        if not onnx_path.is_file():
            raise FileNotFoundError(f"ONNX model not found: {onnx_path}")

        sess_options = ort.SessionOptions()
        sess_options.intra_op_num_threads = self.settings.num_threads
        sess_options.inter_op_num_threads = 1
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        self.session = ort.InferenceSession(
            str(onnx_path),
            sess_options,
            providers=["CPUExecutionProvider"],
        )
        inputs = self.session.get_inputs()
        self.input_name = self.settings.onnx_input_name or inputs[0].name
        self.mel = AudioToMelSpectrogram(self.settings, self.device).eval()
        self.baseline = load_val_line_baseline(self.settings)
        if self.baseline.shape[0] != len(self.labels):
            raise ValueError(
                f"baseline length {self.baseline.shape[0]} != num labels {len(self.labels)}"
            )
        self._preflight()

    def _preflight(self) -> None:
        cs = chunk_samples(self.settings)
        dummy = torch.zeros((1, 1, cs), dtype=torch.float32, device=self.device)
        with torch.no_grad():
            mel = self.mel(dummy)
        mel_np = mel.detach().cpu().numpy().astype(np.float32, copy=False)
        outs = self.session.run(None, {self.input_name: mel_np})
        idx = self.settings.species_output_index
        if idx >= len(outs):
            raise IndexError(f"species_output_index={idx} but ONNX returned {len(outs)} outputs")
        logits = np.asarray(outs[idx])
        if logits.shape[-1] != len(self.labels):
            raise ValueError(
                f"Species dim {logits.shape[-1]} != num labels {len(self.labels)}"
            )

    def predict_waveform_batch(
        self, chunks: torch.Tensor
    ) -> tuple[np.ndarray, np.ndarray | None]:
        """
        chunks: shape (N, 1, CHUNK_SAMPLES), float32 CPU tensor is fine if moved here
        Returns (species_probs, attention_weights) where species_probs is (N, num_classes)
        and attention_weights is (N, T) or None when the ONNX model has no attention head.
        """
        chunks = chunks.to(device=self.device, dtype=torch.float32)
        n = chunks.shape[0]
        bs = max(1, self.settings.batch_size)
        probs_parts: list[np.ndarray] = []
        attn_parts: list[np.ndarray] = []
        has_attention = False

        with torch.no_grad():
            for start in range(0, n, bs):
                batch = chunks[start : start + bs]
                mel = self.mel(batch)
                mel_np = mel.detach().cpu().numpy().astype(np.float32, copy=False)
                outs = self.session.run(None, {self.input_name: mel_np})
                sp_idx = self.settings.species_output_index
                logits = np.asarray(outs[sp_idx])
                probs = torch.sigmoid(torch.from_numpy(logits)).numpy().astype(
                    np.float32, copy=False
                )
                probs_parts.append(probs)

                attn_idx = self.settings.attention_output_index
                if attn_idx < len(outs):
                    has_attention = True
                    attn_parts.append(
                        np.asarray(outs[attn_idx], dtype=np.float32).reshape(
                            probs.shape[0], -1
                        )
                    )

        out = np.concatenate(probs_parts, axis=0)
        out = np.clip(np.nan_to_num(out, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0)

        attention: np.ndarray | None = None
        if has_attention and attn_parts:
            attention = np.concatenate(attn_parts, axis=0)
            attention = np.clip(
                np.nan_to_num(attention, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0
            )

        return out.astype(np.float32, copy=False), attention
