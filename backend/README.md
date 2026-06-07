---
title: EchoWing Bird API
emoji: 🐦
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# EchoWing 鳥聲辨識 API（Perch v2）

FastAPI 後端：上傳 5 秒 WAV chunks → 物種預測、頻譜圖、決策輔助。

## 端點

| 路徑 | 說明 |
|------|------|
| `GET /` | 服務說明 |
| `GET /docs` | Swagger UI |
| `GET /api/health` | 程序存活 + `ready` / `status` |
| `GET /api/warmup` | 觸發或查詢模型預熱 |
| `GET /api/ready` | 模型已載入時 200，否則 503 |
| `POST /api/predict` | 推論（multipart `audio_chunks`） |

## 預熱（DEMO 前必做）

模型約 **410MB**，首次載入可能需 **1～2 分鐘**。Space 啟動後請輪詢：

```bash
curl -s "https://<your-space>.hf.space/api/warmup"
# 直到 JSON 中 "ready": true
```

或瀏覽器開啟 `/api/ready`，出現 200 即可開始 demo。

詳細部署步驟見倉庫內 `DEPLOY_HF.md`。

# Perch CPU Runtime Selector

The original TensorFlow Perch runtime remains the default:

```bash
TRIAGELENS_PERCH_RUNTIME=tf
```

Validated converted artifacts can be tested without changing the API or UI:

```bash
TRIAGELENS_PERCH_RUNTIME=tflite
TRIAGELENS_PERCH_TFLITE_PATH=models/perch/perch_v2_cpu_fp32.tflite
```

Available selector values are `tf`, `onnx`, `onnx_int8`, `tflite`, and
`tflite_int8`. The current Perch v2 CPU SavedModel cannot be exported to a
validated ONNX artifact because it contains `XlaCallModule`, so ONNX selections
fall back to TensorFlow. Any optimized-runtime load failure is logged and also
falls back to TensorFlow.

Use one Uvicorn worker to avoid loading duplicate model copies. Keep
`TRIAGELENS_PERCH_XAI_STRIDE_SEC=0.3` for production; the 0.1 setting is for
benchmarking and is substantially slower.
