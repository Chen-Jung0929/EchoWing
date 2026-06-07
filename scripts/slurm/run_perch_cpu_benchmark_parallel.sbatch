#!/usr/bin/env bash
#SBATCH -A mst109178
#SBATCH -J perch-bench-par
#SBATCH -p ngs372G
#SBATCH -c 56
#SBATCH --mem=350g
#SBATCH --output=/staging/biology/kevinlin0411/EchoWing/logs/parallel-%j.out
#SBATCH --error=/staging/biology/kevinlin0411/EchoWing/logs/parallel-%j.err

set -euo pipefail
cd /staging/biology/kevinlin0411/EchoWing
module load python/3.12.2
source .venv-perch-nchc/bin/activate
export CUDA_VISIBLE_DEVICES=""
export OMP_NUM_THREADS=2
export MKL_NUM_THREADS=2
export OPENBLAS_NUM_THREADS=2
export TF_CPP_MIN_LOG_LEVEL=2
export PYTHONPATH=/staging/biology/kevinlin0411/EchoWing/backend

python tools/perch_cpu_optimization/05_benchmark_30s_cpu.py \
  --runtimes tf --measured-runs 3 --output-stem 30s_cpu_benchmark_tf &
PID_TF=$!
python tools/perch_cpu_optimization/05_benchmark_30s_cpu.py \
  --runtimes tflite --measured-runs 3 --output-stem 30s_cpu_benchmark_tflite &
PID_TFLITE=$!
python tools/perch_cpu_optimization/05_benchmark_30s_cpu.py \
  --runtimes tflite_int8 --measured-runs 3 --output-stem 30s_cpu_benchmark_tflite_int8 &
PID_INT8=$!

wait "$PID_TF"
wait "$PID_TFLITE"
wait "$PID_INT8"

python tools/perch_cpu_optimization/09_merge_parallel_benchmarks.py
python tools/perch_cpu_optimization/08_generate_final_recommendation.py
