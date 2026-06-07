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

# EchoWing 鳥聲辨識 API（Perch v2 TFLite）

FastAPI 後端：上傳音訊 → Perch TFLite FP32（`perch_v2_cpu_fp32.tflite`）物種預測、頻譜圖、XAI。

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
