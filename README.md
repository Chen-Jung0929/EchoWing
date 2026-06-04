# EchoWing（BirdCLEF）— 鳥類聲學辨識 Web 應用

以 **React + Vite** 為前端、**FastAPI** 為後端的鳥類聲學辨識系統（產品名稱 **EchoWing**）。使用者可上傳音訊／影片或在瀏覽器錄音（**最長 30 秒、20MB**），後端以 **32 kHz 單聲道**解碼，依模型以**不重疊分析窗**推論（Perch／SILIC **5 秒**、BirdNET **3 秒**），透過 **SSE** 先回傳物種與頻譜，再非同步補上 **XAI 時間熱圖**；前端可填寫田野備註並下載 **PDF 報告**（jsPDF + Noto Sans TC）。

支援模型（下拉選擇，**Ensemble 已停用**）：

| 模型 | 代碼 | 分析窗 |
|------|------|--------|
| Perch v2 | `perch` | 5 s |
| BirdNET v2.4 | `birdnet` | 3 s |
| SILIC | `silic` | 5 s（需權重檔） |

---

## 快速開始（開發）

需 **兩個終端機**：後端 `8000`、前端 `5173`。

```powershell
# 終端 1 — 後端
cd backend
conda activate echowing-backend   # 或 .\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 終端 2 — 前端
cd frontend
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:5173`。開發時 `/api/*` 由 Vite 代理至 `http://127.0.0.1:8000`（`frontend/vite.config.js`）。

---

## 功能總覽

| 區塊 | 功能 |
|------|------|
| **首頁** | 上傳音訊／影片、錄音、日／夜主題、中／英、模型下拉 |
| **推論流程** | 整檔上傳 → `POST /api/stream-predict`（SSE） |
| **串流階段** | ① 各窗推論 + 頻譜 → ② 各窗 XAI → `xai_done` |
| **辨識結果** | 總覽投票彙整 + 各分析窗分頁、信心門檻、低信心候選 |
| **視覺化** | Mel 頻譜、XAI 時間條、維基連結 |
| **田野紀錄** | 總覽／各窗備註 → PDF |
| **後端 API** | `health` / `warmup` / `ready` / `predict` / `stream-predict` |
| **部署** | [Hugging Face Docker Space](backend/DEPLOY_HF.md)、[Render](render.yaml)（範例 ONNX） |

### 前端畫面狀態（`App.jsx`）

| 狀態 | 說明 |
|------|------|
| `landing` | 上傳、錄音、選模型、開始辨識 |
| `loading` | 遠端 API 預熱 + Kiwi 動畫 |
| `result` | `BackendResultPanel` / `ChunkResultsView` |
| `error` | 錯誤與重試 |

XAI 計算中：**儲存／PDF 下載停用**，頻譜顯示「XAI生成中...」。

---

## 系統流程

```mermaid
flowchart LR
  subgraph Browser["瀏覽器"]
    A[上傳整檔音訊] --> B[POST /api/stream-predict]
    B --> C[SSE: init → chunk…]
    C --> D[結果 UI + 頻譜]
    C --> E[SSE: xai_update → xai_done]
    E --> D
    D --> F[田野 Modal + PDF]
  end
  subgraph Server["FastAPI :8000"]
    B --> G[解碼 → 不重疊窗]
    G --> H[Perch / BirdNET / SILIC]
    H --> I[JSON chunk + 頻譜]
    I --> J[XAI occlusion]
    J --> E
  end
```

---

## 專案目錄結構

```
BirdCLEF/
├── README.md
├── .gitignore
├── render.yaml                       # Render 部署範例（backend Docker）
├── wavs/                             # 本地測試音檔（不納版控）
│
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI、predict、stream-predict
│   │   ├── config.py                 # TRIAGELENS_* 設定
│   │   ├── model_loader.py           # 背景載入多模型、warmup
│   │   ├── inference.py              # 預測器工廠
│   │   ├── perch_inference.py
│   │   ├── birdnet_inference.py
│   │   ├── silic_inference.py
│   │   ├── xai.py                    # Occlusion 熱圖
│   │   ├── spectrogram.py
│   │   ├── audio_mel.py
│   │   ├── adjustion.py              # taxonomy 中英文名
│   │   └── schemas.py
│   ├── models/
│   │   ├── perch/                    # SavedModel、labels.csv、物種表
│   │   ├── birdnet/                  # audio-model.tflite、labels/zh.txt
│   │   ├── silic/                    # silic_taxonomy.csv、*.pt（本地）
│   │   ├── resnet18_v3_int8.onnx
│   │   └── val_line.json
│   ├── scripts/                      # hf_warmup、taxo_gen、測試
│   ├── Dockerfile · DEPLOY_HF.md
│   └── requirements.txt
│
└── frontend/
    ├── vite.config.js
    ├── public/
    │   ├── mock_data/perch_result.json
    │   └── fonts/NotoSansTC-Regular.ttf
    └── src/
        ├── App.jsx                   # 串流推論、模型選擇
        ├── services/api.js           # analyzeAudioStream、warmup
        ├── features/results/         # PerchResultBody、BackendResultPanel
        ├── utils/
        │   ├── ChunkResultsView.jsx
        │   ├── aggregateByVote.js    # 總覽投票（分析窗編號）
        │   ├── chunkIdentity.js      # SSE chunk 合併
        │   ├── spectrogramCache.js
        │   └── pdf/
        └── i18n/locales/zh.js · en.js
```

---

## 環境需求

| 元件 | 建議 | 說明 |
|------|------|------|
| **Node.js** | 20 LTS | 前端 |
| **Python** | 3.10–3.11 | 後端、TF CPU、PyTorch |
| **Git LFS** | 選用 | HF 部署大型模型（見 `backend/.gitattributes`） |

---

## 從零開始建置

### 0. 取得原始碼與模型

```powershell
git clone <repository-url>
cd BirdCLEF
```

將模型放入 **`backend/models/`**（見 [模型檔案](#模型檔案)）。大型檔案預設不進 Git，請依 `backend/.gitignore` 與 LFS 說明自行下載。

### 1. 後端

```powershell
cd backend
conda create -n echowing-backend python=3.11 -y
conda activate echowing-backend
pip install -U pip
pip install -r requirements.txt
```

選用 `backend/.env`：

```env
TRIAGELENS_INFERENCE_BACKEND=perch
TRIAGELENS_CONFIDENCE_THRESHOLD=0.5
TRIAGELENS_ENABLE_XAI=true
```

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
curl http://127.0.0.1:8000/api/health
```

### 2. 前端

```powershell
cd frontend
npm install
npm run dev
```

正式建置：

```powershell
npm run build
# 遠端後端：建立 frontend/.env.production.local
# VITE_API_BASE=https://<your-api-host>/api
```

---

## 日常開發速查

| 步驟 | 終端 1（後端） | 終端 2（前端） |
|------|----------------|----------------|
| 啟動 | `uvicorn app.main:app --reload` | `npm run dev` |
| 檢查 | `curl http://127.0.0.1:8000/api/ready` | 開啟 `:5173` |
| 建置 | — | `npm run build` |
| Lint / PDF | — | `npm run lint` · `npm run test:pdf` |

---

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/api/health` | 存活與設定摘要 |
| `GET` / `POST` | `/api/warmup` | 預熱／查詢載入狀態 |
| `GET` | `/api/ready` | 模型就緒 200，否則 503 |
| `POST` | `/api/predict` | 整段音訊一次回傳 JSON |
| `POST` | `/api/stream-predict` | **SSE**：先 chunk，再 `xai_update`、`xai_done` |

**共用表單欄位（multipart）：**

| 欄位 | 說明 |
|------|------|
| `audio_chunks` | 音訊檔（前端送整檔即可） |
| `original_filename` | 原始檔名 |
| `sample_rate` | 預設 `32000` |
| `model_selection` | `perch` \| `birdnet` \| `silic` |

**SSE 事件：**

| `event` | 說明 |
|---------|------|
| `init` | 總長、窗長、`xai_pending` |
| （無） | 一般 chunk JSON（`index` = 窗起點秒數） |
| `xai_update` | 補上該窗 `xai_heatmap` |
| `xai_done` | XAI 階段結束 |

回應結構與 `frontend/public/mock_data/perch_result.json` 對齊（欄位隨版本可能擴充）。

---

## 環境變數（後端）

前綴 **`TRIAGELENS_`**，可寫入 `backend/.env`（勿提交）。

| 變數 | 預設 | 說明 |
|------|------|------|
| `TRIAGELENS_INFERENCE_BACKEND` | `perch` | 啟動預設後端（多模型仍會嘗試載入） |
| `TRIAGELENS_PERCH_SAVEDMODEL_PATH` | `models/perch/perch_v2_cpu_savedmodel` | Perch SavedModel |
| `TRIAGELENS_PERCH_LABELS_PATH` | `…/assets/labels.csv` | ~14795 學名標籤 |
| `TRIAGELENS_TAXONOMY_CSV_PATH` | `models/perch/species_info_completed_comma.csv` | 中英文名對照 |
| `TRIAGELENS_BIRDNET_MODEL_PATH` | `models/birdnet/audio-model.tflite` | BirdNET |
| `TRIAGELENS_BIRDNET_LABELS_PATH` | `models/birdnet/labels/zh.txt` | 標籤 |
| `TRIAGELENS_SILIC_MODEL_PATH` | `models/silic/silic_best_model.pt` | SILIC 權重 |
| `TRIAGELENS_CONFIDENCE_THRESHOLD` | `0.5` | 信心門檻 |
| `TRIAGELENS_ENABLE_XAI` | `true` | 是否跑 occlusion XAI |
| `TRIAGELENS_MAX_CHUNKS` | `120` | 單次請求窗數上限 |
| `TRIAGELENS_EAGER_WARMUP` | `true` | 啟動時背景載入模型 |

完整清單見 `backend/app/config.py`。

---

## 模型檔案

路徑皆相對於 **`backend/`** 工作目錄。

**Perch（`models/perch/`）**

- `perch_v2_cpu_savedmodel/` — TensorFlow SavedModel（輸出 key：`label`）
- `perch_v2_cpu_savedmodel/assets/labels.csv` — 類別學名
- `species_info_completed_comma.csv` — 顯示用 taxonomy
- `pseudo_best_model.pt` — 選用分類頭

**BirdNET v2.4（`models/birdnet/`）**

- `audio-model.tflite` — [Zenodo BirdNET_v2.4](https://zenodo.org/records/7430856)
- `labels/zh.txt` — 中文標籤（倉庫僅版控 `zh.txt`，其餘語系請本地放置）

**SILIC（`models/silic/`）**

- `python scripts/taxo_gen.py` → `silic_taxonomy.csv`
- `silic_best_model.pt` — 需自行訓練／下載（`.gitignore` 排除）

**ONNX（`models/` 根目錄）**

- `resnet18_v3_int8.onnx`、`val_line.json` — `TRIAGELENS_INFERENCE_BACKEND=onnx` 或 Render 範例

---

## 部署

### Hugging Face Spaces（推薦 DEMO）

見 **`backend/DEPLOY_HF.md`**、`backend/Dockerfile`（埠 **7860**）。

```powershell
python backend/scripts/hf_warmup.py --url https://<帳號>-<space>.hf.space
```

前端：`VITE_API_BASE=https://<space>.hf.space/api` → `npm run build`。

### Render

根目錄 **`render.yaml`** 範例以 Docker 建置 `backend/`（預設 ONNX）。依需求調整 `envVars` 與方案。

### 自架

- 後端：`uvicorn app.main:app --host 0.0.0.0 --port 8000`（生產勿用 `--reload`）
- 前端：`npm run build` 後以靜態伺服器提供 `dist/`，並反向代理 `/api` 或設定 `VITE_API_BASE`

---

## 開發注意事項

- 修改前端後執行 `npm run build` 確認編譯（見 `frontend/AGENTS.md`）。
- Mock：`App.jsx` 的 `USE_MOCK_FALLBACK`（預設 `false`）。
- 錄音需 **HTTPS** 或 **localhost**。
- PDF 字型：`frontend/public/fonts/NotoSansTC-Regular.ttf`。
- 總覽「出現片段」編號 = **分析窗序號**（與 tab「窗 1、窗 2」一致），非時間軸秒數。

---

## 授權與免責

本專案 AI 模組僅供分析與決策輔助參考，不保證辨識結果之絕對正確性。實際保育或研究用途請以專業鑑定為準。

---

## 相關競賽

本應用對應 [BirdCLEF](https://www.kaggle.com/competitions/birdclef-2026) 聲學辨識任務之模型與工作流程。
