# EchoWing 後端與模型部署指南 (給接手工程師或 AI 助手)

你好！這份文件是為了協助你（電機系的同學或 AI 助手）接手處理 **EchoWing 多模型生態聲學監測網站** 的後端與模型部署任務。

我們近期對系統架構進行了大規模升級，導入了 **Server-Sent Events (SSE) 串流推論**、**多模型混合 (Ensemble)** 以及 **多軌道連續型 XAI 熱力圖**。前端的部分（Vercel）已經全部準備就緒，目前的任務是**成功將後端架設在 Hugging Face Spaces 上，並確保所有模型權重載入正常**。

---

## 1. 架構異動概述
- **串流 API (`/api/stream-predict`)**：現在前端上傳音檔後，會立刻接收後端以 1 秒滑移步伐 (1s stride) 吐出的 `ChunkPrediction` JSON 串流。
- **多模型支援**：除了原本的 Perch 模型，現在加入了 `BirdNET` 與 `SILIC`。當使用者在前端選擇 "Ensemble" 時，後端會使用 `asyncio.gather` 平行執行這三個模型。
- **XAI**：我們使用了遮蔽敏感度 (Occlusion Sensitivity) 演算法。

---

## 2. 你的核心任務：Hugging Face 部署

### 任務 A：確認模型權重檔案 (Model Weights)
這是最容易出錯的地方！由於加入了新模型，伺服器啟動時需要載入模型權重。
請打開 `backend/app/config.py`，查看以下模型的預設路徑與載入邏輯：

1. **Perch**：原本可能是自動從 Kaggle / TensorFlow Hub 下載，請確認伺服器有網路權限，或直接將權重放入指定資料夾。
2. **BirdNET**：後端現在會嘗試尋找 `.tflite` 模型權重（例如 `birdnet_v2.4_tflite.tflite`）。
3. **SILIC**：後端會嘗試尋找 SILIC 的權重檔（ONNX 或 PyTorch 格式）。

**👉 指示：** 
- 這些模型檔案通常高達數十甚至數百 MB。你 **不能** 直接用標準 Git 把他們 push 過去。
- 你必須利用 **Git LFS (Large File Storage)** 推送，或者直接登入 Hugging Face 的網站，進入 Space 的 `Files` 頁籤手動上傳這幾個模型權重檔。
- 請確保檔案放置的相對路徑與 `backend/app/config.py` 中設定的完全一致！

### 任務 B：推播程式碼至 Hugging Face Spaces
請將本專案根目錄下 `backend/` 內的**所有內容**，推送到 Hugging Face Space 的根目錄。
1. `backend/app/` -> Space 的 `app/`
2. `backend/requirements.txt` -> Space 的 `requirements.txt`
3. `backend/Dockerfile` -> Space 的 `Dockerfile` (如果有使用 Docker)

### 任務 C：監控啟動日誌 (Logs)
1. 檔案與程式碼上傳完畢後，Hugging Face Space 會自動開始 `Building` 與 `Running`。
2. 點開 Space 的 **Logs** 面板。
3. 系統的生命週期管理 (Lifespan) 會在背景觸發模型預熱 (Warmup)。
4. 如果你看到 `Loaded perch`、`Loaded birdnet`，就代表成功了！
5. **常見錯誤**：
   - `FileNotFoundError`：你忘記上傳模型權重，或是路徑放錯了。
   - `OOM (Out of Memory)`：三個模型同時載入如果超過 Free Tier (16GB RAM) 的限制，你可能需要幫他們升級 Space 規格，或者在 `config.py` 中將不必要的模型設為延遲載入。

---

## 3. 測試指南
當 Hugging Face 顯示 `Running` 且沒有錯誤後，請打開前端 Vercel 的網址：
1. 點擊上傳按鈕，隨意上傳一段 30 秒以內的鳥叫聲。
2. 模型下拉選單選擇 `Ensemble`。
3. 送出後，你應該會看到頻譜圖瞬間出現，接著底部會出現紅色(Perch)、藍色(BirdNET)、綠色(SILIC) 的多軌彩色進度條跟著時間推移長出來！
4. 恭喜你完成任務！

祝開發順利！
