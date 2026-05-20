# BirdCLEF 2026 — 聲學辨識 Web 應用

以 **React + Vite** 為前端、**FastAPI + ONNX Runtime** 為後端的鳥類／生物聲學辨識系統。使用者上傳音訊或影片後，前端會將音訊切成 5 秒片段（32 kHz mono WAV），後端以 ResNet18 INT8 模型推論，回傳物種預測、注意力權重與決策輔助資訊。

## 專案結構

```
BirdCLEF/
├── backend/                 # FastAPI 推論 API
│   ├── app/
│   │   ├── main.py          # 路由：/api/health、/api/predict
│   │   ├── inference.py     # ONNX 推論
│   │   ├── audio_mel.py     # 波形載入與 Mel 特徵
│   │   ├── config.py        # 設定（環境變數前綴 TRIAGELENS_）
│   │   ├── schemas.py       # API 回應結構
│   │   └── adjustion.py     # taxonomy 對照表
│   ├── models/              # 模型與標籤（需一併部署）
│   │   ├── resnet18_v3_int8.onnx
│   │   ├── taxonomy.csv
│   │   └── val_line.json
│   ├── scripts/             # 手動測試腳本
│   ├── notebooks/           # 實驗用 Jupyter
│   └── data/                # 本地資料（已 gitignore，目錄以 .gitkeep 保留）
├── frontend/                # React 前端
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/useAudioProcessor.js
│   │   ├── services/api.js
│   │   └── utils/           # 片段結果、注意力視覺化等
│   └── public/mock_data/    # 後端離線時的 Mock JSON
└── wavs/                    # 本地測試用 WAV（不納入版控）
```

## 環境需求

| 元件 | 版本建議 |
|------|----------|
| Node.js | 18+ |
| Python | 3.10+ |
| 作業系統 | Windows / macOS / Linux |

後端依賴 PyTorch、ONNX Runtime 等，首次安裝可能需數分鐘。

## 快速開始

### 1. 後端

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

確認健康檢查：

```powershell
curl http://127.0.0.1:8000/api/health
```

### 2. 前端

另開一個終端機：

```powershell
cd frontend
npm install
npm run dev
```

瀏覽器開啟 Vite 顯示的網址（通常為 `http://localhost:5173`）。開發模式下，`/api` 會由 Vite 代理至 `http://127.0.0.1:8000`（見 `frontend/vite.config.js`）。

### 3. 手動測試 API

```powershell
cd backend
python scripts/test_predict_two_chunks.py
```

或將測試 WAV 放在專案根目錄的 `wavs/`（例如 `chunk_0.wav`、`chunk_1.wav`），再以 curl 上傳（腳本內有 PowerShell 範例）。

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/api/health` | 服務狀態與類別數 |
| `POST` | `/api/predict` | 上傳多個 `audio_chunks`（multipart），每段約 5 秒 WAV |

**表單欄位（predict）：**

- `audio_chunks`：多個 WAV 檔（建議檔名 `chunk_0.wav`、`chunk_1.wav` … 以利排序）
- `original_filename`（選填）：原始檔名
- `sample_rate`（選填，預設 32000）

回應格式與 `frontend/public/mock_data/perch_result.json` 對齊，供前端直接渲染。

## 環境變數

後端設定類別為 `Settings`，環境變數前綴為 **`TRIAGELENS_`**，亦可使用 `backend/.env`（勿提交至 Git）。

| 變數 | 預設 | 說明 |
|------|------|------|
| `TRIAGELENS_ONNX_MODEL_PATH` | `models/resnet18_v3_int8.onnx` | ONNX 模型路徑（相對於 `backend/` 工作目錄） |
| `TRIAGELENS_TAXONOMY_CSV_PATH` | `models/taxonomy.csv` | 物種對照表 |
| `TRIAGELENS_VAL_LINE_JSON_PATH` | `models/val_line.json` | 基線分數 JSON |
| `TRIAGELENS_MAX_CHUNKS` | `24` | 單次請求最多片段數 |
| `TRIAGELENS_MAX_BODY_MB` | `50` | 請求本體大小上限（MB） |

前端正式部署可設定 `VITE_API_BASE` 指向後端根路徑（預設開發時為 `/api`）。

## 模型檔案

`backend/models/` 應包含：

- `resnet18_v3_int8.onnx` — 推論模型（約 11 MB，已納入版控）
- `taxonomy.csv` — 物種中英文名與分類
- `val_line.json` — 驗證基線向量

若缺少 `taxonomy.csv`，啟動時 `load_taxonomy_map` 會失敗；請確認檔案存在或透過環境變數指定路徑。

## 前端功能摘要

- 上傳音訊／影片，自動重採樣為 32 kHz、切成 5 秒 chunk（最長約 60 秒）
- 中英雙語、日／夜主題
- 後端不可用時可載入 Mock 資料（`mock_data/perch_result.json`）
- 多片段 Top-K 投票彙整、注意力權重視覺化、PDF 報告匯出

## 建置正式版前端

```powershell
cd frontend
npm run build
```

產出於 `frontend/dist/`。需自行設定靜態檔伺服器，並將 API 請求導向後端（`VITE_API_BASE`）。

## 授權與免責

本專案 AI 模組僅供分析與決策輔助參考，不保證辨識結果之絕對正確性。實際保育或研究用途請以專業鑑定為準。

## 相關競賽

本應用對應 [BirdCLEF](https://www.kaggle.com/competitions/birdclef-2026) 聲學辨識任務之模型與工作流程。
