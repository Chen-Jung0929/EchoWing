# Hugging Face Spaces (Docker SDK) — app_port 7860
# Build context: backend/ (set Space root directory to backend in HF settings)
FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    TRIAGELENS_INFERENCE_BACKEND=perch \
    TRIAGELENS_EAGER_WARMUP=true \
    TRIAGELENS_SKIP_PREFLIGHT=true \
    TRIAGELENS_NUM_THREADS=2

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
