# 部署後端到 Hugging Face Spaces

本文件說明如何將 `backend/`（含 **~410MB** 的 `models/`）部署為 **Docker Space**。

## 前置條件

- Hugging Face 帳號
- 本機已安裝 [Git LFS](https://git-lfs.com/)
- `backend/models/` 內含：
  - `perch/perch_v2_cpu_savedmodel/`
  - `perch/pseudo_best_model.pt`
  - `perch/species_info_completed_comma.csv`
  - （選用）`perch/taxonomy.csv`、`val_line.json`（ONNX）、`resnet18_v3_int8.onnx`

## 1. 建立 Docker Space

1. 前往 [huggingface.co/new-space](https://huggingface.co/new-space)
2. **SDK** 選 **Docker**
3. 建議硬體：**CPU basic**（免費 16GB RAM，適合 TensorFlow CPU + Perch）
4. 可連結 GitHub 倉庫，或先建空 Space 再 push

### Monorepo（BirdCLEF 整包倉庫）

在 Space **Settings → Space directory**（或 Repository subdirectory）設為：

```text
backend
```

讓 Space 根目錄對應 `backend/`，才能使用其中的 `Dockerfile` 與 `README.md`（含 HF YAML frontmatter）。

## 2. 用 Git LFS 推送模型（~410MB）

`models/` 大檔需 LFS，否則無法 push 到 HF。

```powershell
cd backend
git lfs install
git lfs track "models/perch/perch_v2_cpu_savedmodel/**"
git lfs track "models/perch/pseudo_best_model.pt"
git add .gitattributes
git add models/
git commit -m "Track models for HF Space deploy"
git push
```

若 Space 綁定 GitHub，推送至對應分支後 HF 會自動 rebuild。

## 3. 建置與啟動

Space 會依 `backend/Dockerfile`：

- 安裝 `requirements.txt`（含 `tensorflow-cpu`、`torch`）
- `COPY models` 進映像
- 在 **7860** 埠啟動 `uvicorn app.main:app`

預設環境變數（可在 Space **Settings → Variables** 覆寫）：

| 變數 | 預設 | 說明 |
|------|------|------|
| `TRIAGELENS_EAGER_WARMUP` | `true` | 啟動後背景載入模型 |
| `TRIAGELENS_SKIP_PREFLIGHT` | `true` | 略過啟動試推論（省時） |
| `TRIAGELENS_NUM_THREADS` | `2` | CPU 執行緒 |
| `TRIAGELENS_CONFIDENCE_THRESHOLD` | `0.5` | 信心門檻 |

首次 build 可能 **15～40 分鐘**（安裝 TF + 複製模型）。

## 4. 預熱 API（DEMO 必讀）

| 端點 | 用途 |
|------|------|
| `GET /api/health` | 程序已起來；看 `ready` 是否 `true` |
| `GET` 或 `POST /api/warmup` | 若尚未載入則開始載入；可重複呼叫 |
| `GET /api/ready` | **僅在** `ready: true` 時回 200 |

### 命令列預熱（等到就緒）

```powershell
cd backend
python scripts/hf_warmup.py --url https://<帳號>-<space名稱>.hf.space
```

### DEMO 當天建議流程

1. Space 狀態為 **Running**
2. 執行 `hf_warmup.py` 或手動開 `/api/warmup`，等到 `ready: true`（約 1～2 分鐘）
3. 簡報前每 **10 分鐘** 再 ping 一次 `/api/health`（避免休眠後第一個觀眾等待）
4. 前端建置時設定 API：

```powershell
cd frontend
$env:VITE_API_BASE="https://<帳號>-<space名稱>.hf.space/api"
npm run build
```

## 5. 驗證

```powershell
curl https://<space>.hf.space/api/health
curl https://<space>.hf.space/api/ready
```

Swagger：`https://<space>.hf.space/docs`

## 6. 常見問題

| 問題 | 處理 |
|------|------|
| Build 失敗 / 逾時 | 確認 LFS 模型已 push；必要時升級 Space 硬體 |
| `ready` 長期 `false` | 看 Space **Logs** 是否 OOM 或缺 `perch_v2_cpu_savedmodel` |
| 前端 CORS | 後端已 `allow_origins=["*"]` |
| 第一次 predict 仍慢 | 先 `/api/ready` 200 再操作前端 |
| Space 休眠 | 免費方案閒置會暫停；DEMO 前再預熱 |

## 參考

- [使用 Docker 在 Hugging Face 上部署 FastAPI](https://huggingface.tw/blog/HemanthSai7/deploy-applications-on-huggingface-spaces)
- [Spaces Docker 文件](https://huggingface.co/docs/hub/spaces-sdks-docker)
