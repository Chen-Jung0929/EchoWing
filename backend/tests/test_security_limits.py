import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    # health endpoint still works
    response = client.get("/api/health")
    assert response.status_code == 200
    assert "ok" in response.json()

def test_cors_allowed_origin():
    # allowed local origin gets CORS header
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET"
    }
    response = client.options("/api/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"

def test_cors_disallowed_origin():
    # disallowed origin does not get permissive CORS
    headers = {
        "Origin": "https://evil.example",
        "Access-Control-Request-Method": "GET"
    }
    response = client.options("/api/health", headers=headers)
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers or response.headers["access-control-allow-origin"] != "https://evil.example"

def test_predict_payload_too_large():
    # POST /api/predict with too-large body returns 413
    # Our max_upload_bytes is set to 25MB by default, let's fake the header first
    headers = {"Content-Length": str((25 * 1024 * 1024) + 1)}
    response = client.post("/api/predict", headers=headers, data={})
    assert response.status_code == 413
    assert response.json()["detail"]["code"] == "ERR_PAYLOAD_TOO_LARGE"

def test_stream_predict_payload_too_large():
    # POST /api/stream-predict with Content-Length greater than max returns 413
    headers = {"Content-Length": str((25 * 1024 * 1024) + 1)}
    response = client.post("/api/stream-predict", headers=headers, data={})
    assert response.status_code == 413
    assert response.json()["detail"]["code"] == "ERR_PAYLOAD_TOO_LARGE"

# Rate limiting is disabled by default for testing so we don't block normal tests.
# If we wanted to test it, we could override the config here, but we will keep it simple.
