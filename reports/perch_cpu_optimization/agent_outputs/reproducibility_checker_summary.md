# reproducibility_checker Summary

The agent ran and generated `feedback_box/reproducibility_check_20260607_142427.md`, but its JSON console output ended with a Windows CP950 `UnicodeEncodeError`.

The scan was polluted by the local `.venv-perch` environment and reported thousands of irrelevant findings. Useful action retained: document the Python/TensorFlow/ONNX Runtime versions and exact rerun commands.
