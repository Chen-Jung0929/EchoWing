from __future__ import annotations

import sys
import types

from app.config import Settings
from app.inference import create_perch_predictor


class _TensorFlowPredictor:
    def __init__(self, settings):
        self.settings = settings


class _TFLitePredictor:
    def __init__(self, settings, model_path):
        self.settings = settings
        self.model_path = model_path


def _install_fake_predictors(monkeypatch, *, tflite_raises: bool = False):
    tf_module = types.ModuleType("app.perch_inference")
    tf_module.PerchChunkPredictor = _TensorFlowPredictor
    monkeypatch.setitem(sys.modules, "app.perch_inference", tf_module)

    tflite_module = types.ModuleType("app.perch_tflite_predictor")
    if tflite_raises:
        class FailingTFLite:
            def __init__(self, settings, model_path):
                raise RuntimeError("broken artifact")

        tflite_module.PerchTFLitePredictor = FailingTFLite
    else:
        tflite_module.PerchTFLitePredictor = _TFLitePredictor
    monkeypatch.setitem(sys.modules, "app.perch_tflite_predictor", tflite_module)


def test_tflite_runtime_is_opt_in(monkeypatch):
    _install_fake_predictors(monkeypatch)
    settings = Settings(perch_runtime="tflite")

    predictor = create_perch_predictor(settings)

    assert isinstance(predictor, _TFLitePredictor)
    assert predictor.model_path == settings.perch_tflite_path


def test_failed_optimized_runtime_falls_back_to_tensorflow(monkeypatch):
    _install_fake_predictors(monkeypatch, tflite_raises=True)
    settings = Settings(perch_runtime="tflite_int8")

    predictor = create_perch_predictor(settings)

    assert isinstance(predictor, _TensorFlowPredictor)


def test_unavailable_onnx_runtime_falls_back_to_tensorflow(monkeypatch):
    _install_fake_predictors(monkeypatch)
    settings = Settings(perch_runtime="onnx_int8")

    predictor = create_perch_predictor(settings)

    assert isinstance(predictor, _TensorFlowPredictor)
