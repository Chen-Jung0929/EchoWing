#!/usr/bin/env bash
#SBATCH -A mst109178
#SBATCH -J perch-cpu-opt
#SBATCH -p ngs372G
#SBATCH -c 56
#SBATCH --mem=350g
#SBATCH --output=/staging/biology/kevinlin0411/EchoWing/logs/slurm-%j.out
#SBATCH --error=/staging/biology/kevinlin0411/EchoWing/logs/slurm-%j.err

set -euo pipefail
cd /staging/biology/kevinlin0411/EchoWing
module load python/3.12.2
python3 -m venv .venv-perch-nchc
source .venv-perch-nchc/bin/activate
python -m pip install --no-index --find-links=wheelhouse \
  -r tools/perch_cpu_optimization/requirements-nchc.txt
python -m pip install --no-index --find-links=wheelhouse torch==2.8.0 torchaudio==2.8.0
export CUDA_VISIBLE_DEVICES=""
export OMP_NUM_THREADS=2
export MKL_NUM_THREADS=2
export OPENBLAS_NUM_THREADS=2
export TF_CPP_MIN_LOG_LEVEL=2
export PYTHONPATH=/staging/biology/kevinlin0411/EchoWing/backend

python tools/perch_cpu_optimization/00_inspect_current_perch.py
python tools/perch_cpu_optimization/01_export_perch_onnx.py
python tools/perch_cpu_optimization/02_quantize_onnx_int8.py
python tools/perch_cpu_optimization/03_export_perch_tflite.py
python tools/perch_cpu_optimization/04_prepare_30s_test_audio.py
python tools/perch_cpu_optimization/06_quick_output_sanity_check.py
python tools/perch_cpu_optimization/07_evaluate_kaggle_distilled_onnx.py

echo "Conversion and sanity checks complete."
echo "Submit scripts/slurm/run_perch_cpu_benchmark_parallel.sbatch for formal benchmarks."
