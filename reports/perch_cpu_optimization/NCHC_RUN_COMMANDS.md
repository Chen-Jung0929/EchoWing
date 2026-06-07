# NCHC EchoWing Perch CPU Optimization Commands

Target: `/staging/biology/kevinlin0411/EchoWing`

The connection uses the toolkit's persistent NCHC bridge because Taiwania 3
requires keyboard-interactive password + Email OTP. Direct public-key SSH is
not enabled for this account.

## Clone Or Update

```bash
mkdir -p /staging/biology/kevinlin0411
cd /staging/biology/kevinlin0411
git clone https://github.com/Chen-Jung0929/EchoWing.git EchoWing
cd EchoWing
git fetch origin
git switch feature/perch-cpu-onnx-int8-optimization
git pull --ff-only
git lfs pull
mkdir -p logs artifacts/perch_cpu_optimization benchmarks/perch_cpu_optimization reports/perch_cpu_optimization tools/perch_cpu_optimization
```

If the feature branch is not pushed yet, sync the local branch with the user's approved transfer method before running benchmarks.

## Prepare Offline Wheelhouse On Login Node

```bash
cd /staging/biology/kevinlin0411/EchoWing
bash scripts/slurm/setup_perch_cpu_wheelhouse.sh
```

Do not run model conversion or benchmarks on the login node. Compute nodes have
no internet access, so the login node only prepares the wheelhouse.

## Submit CPU Job

```bash
python C:/AI_CoScientist_Team_Toolkit/standalone_tools/nchc_connector/validate_slurm.py scripts/slurm/run_perch_cpu_optimization.sbatch
sbatch scripts/slurm/run_perch_cpu_optimization.sbatch
squeue -u kevinlin0411
```

After conversion and sanity checks are complete, run the three formal runtime
benchmarks concurrently. Each benchmark process remains limited to two threads:

```bash
sbatch scripts/slurm/run_perch_cpu_benchmark_parallel.sbatch
squeue -u kevinlin0411
```

The validated resource pairing is `ngs372G`: account `mst109178`, 56 CPU cores,
350 GB memory, no GPU. This large CPU-only node prevents local-memory exhaustion
and speeds conversion/XAI work. The formal benchmark itself still limits
inference libraries to two threads to remain representative of a small Hugging
Face CPU deployment.

Outputs remain under:

- `/staging/biology/kevinlin0411/EchoWing/artifacts/perch_cpu_optimization`
- `/staging/biology/kevinlin0411/EchoWing/benchmarks/perch_cpu_optimization`
- `/staging/biology/kevinlin0411/EchoWing/reports/perch_cpu_optimization`
- `/staging/biology/kevinlin0411/EchoWing/logs`
