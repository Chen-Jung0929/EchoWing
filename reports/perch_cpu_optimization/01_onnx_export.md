# Perch v2 CPU ONNX FP32 Export

## Result

**BLOCKED**

The Kaggle Perch v2 CPU SavedModel wraps the JAX graph in TensorFlow `XlaCallModule`. tf2onnx cannot lower this StableHLO/XLA module to standard ONNX operators.

## Artifact

No valid ONNX artifact was produced.

## Attempts

### Opset 17

- Exit code: `1`
- Error excerpt:

```text
2026-06-07 14:26:55,351 - ERROR - pass1 convert failed for name: "XlaCallModule"
op: "XlaCallModule"
    raise ValueError(
ValueError: Could not infer the attribute type from the elements of the passed Iterable value.
```

### Opset 16

- Exit code: `1`
- Error excerpt:

```text
2026-06-07 14:27:19,716 - ERROR - pass1 convert failed for name: "XlaCallModule"
op: "XlaCallModule"
    raise ValueError(
ValueError: Could not infer the attribute type from the elements of the passed Iterable value.
```

### Opset 15

- Exit code: `1`
- Error excerpt:

```text
2026-06-07 14:27:41,983 - ERROR - pass1 convert failed for name: "XlaCallModule"
op: "XlaCallModule"
    raise ValueError(
ValueError: Could not infer the attribute type from the elements of the passed Iterable value.
```

## Engineering Conclusion

Changing only the ONNX opset does not solve `XlaCallModule`. A real ONNX export would need the original JAX/Flax parameters plus a supported JAX-to-ONNX path, or a separately published ONNX artifact.
