#!/usr/bin/env bash
# Run on the NCHC login node: compute nodes do not have internet access.
set -euo pipefail

ROOT=/staging/biology/kevinlin0411/EchoWing
cd "$ROOT"
mkdir -p wheelhouse logs
module load python/3.12.2
rm -f wheelhouse/*

python3 -m pip download \
  --dest wheelhouse \
  --requirement tools/perch_cpu_optimization/requirements-nchc.txt \
  2>&1 | tee logs/wheelhouse_download.log

# Download CPU-only Torch wheels explicitly. Compute nodes have no internet.
python3 -m pip download \
  --dest wheelhouse \
  --index-url https://download.pytorch.org/whl/cpu \
  "torch==2.8.0" "torchaudio==2.8.0" \
  2>&1 | tee logs/torchaudio_wheel_download.log
