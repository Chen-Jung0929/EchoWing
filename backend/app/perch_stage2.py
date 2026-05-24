from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn


class Stage2Classifier(nn.Module):
    """MLP head trained on Perch embeddings (matches pseudo_best_model.pt state_dict)."""

    def __init__(self, *, hidden_dim: int = 1024, num_classes: int = 234, dropout: float = 0.4) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.LayerNorm(1536),
            nn.Linear(1536, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def load_stage2_checkpoint(path: Path, device: torch.device) -> tuple[Stage2Classifier, np.ndarray, np.ndarray, list[str]]:
    if not path.is_file():
        raise FileNotFoundError(f"pseudo head checkpoint not found: {path}")

    ckpt = torch.load(path, map_location=device, weights_only=False)
    labels = [str(x) for x in ckpt["target_columns"]]
    config = ckpt.get("config") or {}
    hidden_dim = int(config.get("hidden_dim", 1024))
    dropout = float(config.get("dropout", 0.4))

    model = Stage2Classifier(
        hidden_dim=hidden_dim,
        num_classes=len(labels),
        dropout=dropout,
    )
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device)
    model.eval()

    mean = np.asarray(ckpt["feature_mean"], dtype=np.float32).reshape(1, -1)
    std = np.asarray(ckpt["feature_std"], dtype=np.float32).reshape(1, -1)
    if mean.shape[1] != 1536 or std.shape[1] != 1536:
        raise ValueError(f"expected 1536-d feature stats, got mean={mean.shape}, std={std.shape}")

    return model, mean, std, labels
