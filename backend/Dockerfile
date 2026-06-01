FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for audio processing (e.g. libsndfile)
RUN apt-get update && apt-get install -y libsndfile1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Strip tensorflow-cpu and protobuf to save build time and memory on Render (since ONNX backend is used)
RUN sed -i '/tensorflow-cpu/d' requirements.txt && \
    sed -i '/protobuf/d' requirements.txt

# Force install CPU-only versions of PyTorch and Torchaudio to prevent loading massive CUDA libraries
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend files
COPY . .

# Expose the port
EXPOSE 8000

# Run the FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
