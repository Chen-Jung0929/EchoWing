# Hugging Face Spaces (Docker SDK) — app_port 7860
# Build context: backend/ (set Space root directory to backend in HF settings)
FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    OMP_NUM_THREADS=2 \
    MKL_NUM_THREADS=2 \
    OPENBLAS_NUM_THREADS=2 \
    TRIAGELENS_INFERENCE_BACKEND=perch-fast \
    TRIAGELENS_PERCH_RUNTIME=tflite \
    TRIAGELENS_EAGER_WARMUP=true \
    TRIAGELENS_SKIP_PREFLIGHT=true \
    TRIAGELENS_NUM_THREADS=2 \
    TRIAGELENS_XAI_PARALLEL=1 \
    TRIAGELENS_SPECTROGRAM_PARALLEL=2 \
    TRIAGELENS_INFERENCE_BATCH_PARALLEL=1 \
    TRIAGELENS_MAX_CONCURRENT_PREDICTIONS=1 \
    TRIAGELENS_CONFIDENCE_THRESHOLD=0.5 \
    TRIAGELENS_PERCH_CONFIDENCE_THRESHOLD=0.75 \
    TRIAGELENS_XAI_STRIDE_SEC=0.1 \
    TRIAGELENS_PERCH_XAI_STRIDE_SEC=0.3

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -U pip \
    && pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY models ./models

EXPOSE 7860

# Single worker: each worker would load ~410MB+ models separately.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
