# EchoWing Perch CPU 最佳化交接說明

## 1. 給接班同學的結論

目前最適合繼續測試與部署驗證的模型是：

**TFLite FP32：`perch_v2_cpu_fp32.tflite`**

建議先把它當成 opt-in 快速模式，不要直接取代原始 TensorFlow Perch：

```bash
TRIAGELENS_PERCH_RUNTIME=tflite
TRIAGELENS_PERCH_TFLITE_PATH=models/perch/perch_v2_cpu_fp32.tflite
```

原始 TensorFlow runtime 仍是預設值，TFLite 載入失敗時也會自動 fallback
至 TensorFlow。不要移除這個 fallback，直到真實鳥音驗證完成。

目前不建議：

- 把 TFLite FP32 直接設為正式預設。
- 使用 dynamic INT8 追求速度；它比 TFLite FP32 慢。
- 把 FP16 宣稱為已驗證的快速或輕量正式模型。
- 繼續只靠切換 ONNX opset 嘗試轉換目前的 SavedModel。
- 把 BirdCLEF 2026 distilled ONNX 當成 Perch ONNX。

## 2. 模型與輸出概念

目前 EchoWing 使用的 Perch v2 CPU 模型：

- 輸入：32 kHz、mono、5 秒 waveform。
- 輸入 tensor：`float32 [batch, 160000]`。
- Perch 的 PCEN / melspectrogram frontend 已包含在模型內。
- 主要分類輸出：`label [batch, 14795]`。
- 其他輸出包含 `embedding [batch, 1536]`、`spatial_embedding` 與
  `spectrogram`。
- EchoWing 的 30 秒流程使用 1 秒推論步距，因此會建立 30 個 Perch
  waveform windows。
- XAI 使用 occlusion，需要額外執行大量模型推論，因此 XAI latency
  主要受模型推論速度影響。

不同格式或量化方式不代表模型一定更快：

- **FP32**：32-bit floating point。TFLite XNNPACK 對 CPU FP32 有成熟最佳化。
- **Dynamic-range INT8**：主要壓縮權重；輸入、輸出及部分運算仍可能是
  floating point。模型較小，但不保證 CPU 更快。
- **FP16**：權重約可縮小一半；一般 CPU 不一定具備高效率 FP16 kernel，
  runtime 可能轉回 FP32 運算，因此可能只省儲存空間而沒有加速。
- **Full INT8**：需要代表性校正資料；本次沒有合適的真實鳥音 calibration
  dataset，因此沒有嘗試。

## 3. 正式 30 秒 CPU Benchmark

測試位置：NCHC `ngs372G` CPU node，job `1472128`。

為模擬 Hugging Face 小型 CPU 環境，每個 runtime 固定使用 2 threads。
每個設定使用 1 次 warmup 與 3 次正式測量。測試音訊是非生物性 synthetic
audio，只能用於效能與 pipeline 健全性比較。

| runtime | 模型大小 | 載入時間 | XAI 關閉 | XAI 0.3 | XAI 0.1 |
|---|---:|---:|---:|---:|---:|
| TensorFlow original | 391.27 MB | 6.65 s | 17.44 s | 79.09 s | 173.35 s |
| **TFLite FP32** | **388.48 MB** | **2.55 s** | **6.06 s** | **28.97 s** | **65.32 s** |
| TFLite dynamic INT8 | 358.93 MB | 2.52 s | 7.19 s | 33.91 s | 75.76 s |

重要解讀：

- TFLite FP32 在 XAI 關閉時約比 TensorFlow 快 `2.9x`。
- TFLite FP32 在 XAI 0.3 時約比 TensorFlow 快 `2.7x`。
- TFLite FP32 是目前正式 benchmark 中最快的 runtime。
- TFLite FP32 大小幾乎與原始模型相同，所以它是 CPU 加速方案，不是明顯的
  模型縮小方案。
- Dynamic-range INT8 約縮小 `8%`，但所有正式測試都比 TFLite FP32 慢。
- XAI 0.1 即使用 TFLite FP32 仍需約 65 秒，不適合目前同步 Hugging Face
  CPU request；正式預設應維持 0.3。

完整數據：

- `benchmarks/perch_cpu_optimization/30s_cpu_benchmark.csv`
- `benchmarks/perch_cpu_optimization/30s_cpu_benchmark.json`
- `reports/perch_cpu_optimization/05_30s_cpu_benchmark.md`

## 4. 輸出健全性

TensorFlow、TFLite FP32 與 TFLite dynamic INT8 均通過最低限度的 pipeline
sanity check：

- 輸出 shape 都是 `[6, 14795]`。
- 沒有 NaN 或 inf。
- label mapping 可讀取。
- synthetic 測試音訊上的 top-5 class 與 TensorFlow 完全重疊。

這不等於生物辨識準確率相同。接班同學在更改正式預設前，至少應使用一小組
真實鳥音檔執行相同 label-space 與 top-k 比較。

## 5. 為什麼 FP16 沒有完全完成

FP16 **已成功轉換**，並不是轉換失敗：

| TFLite artifact | 大小 | 單次 minimal CPU inference |
|---|---:|---:|
| FP32 | 388.48 MB | 1.326 s |
| dynamic INT8 | 358.93 MB | 1.151 s |
| FP16 | **194.51 MB** | **1.960 s** |

FP16 的優點很明確：模型約縮小一半，可能有助於下載時間、artifact 儲存與
部署 image 大小。

但它在本次 minimal CPU inference 初測中比 FP32 慢約 48%。常見原因是
目標 CPU 與 TFLite kernel 對 FP32/XNNPACK 的最佳化比 FP16 更成熟；即使
權重以 FP16 儲存，執行時仍可能轉成 FP32 或使用效率較低的運算路徑。

因此本次依「CPU 推論加速優先」原則，將正式端到端 benchmark 時間集中在：

- TensorFlow original
- TFLite FP32
- TFLite dynamic INT8

FP16 尚未完成的項目是：

- 30 秒端到端 benchmark。
- XAI 0.3 / 0.1 benchmark。
- 與 TensorFlow 的 quick output sanity comparison。
- runtime selector 整合。

所以目前只能說：

> FP16 是最小的已產出 artifact，但初步 CPU 推論較慢；它可能適合作為
> 儲存空間受限的實驗選項，但尚無足夠證據推薦部署。

不能說 FP16 完全無效，也不能說它一定較慢於所有部署 CPU。若未來「模型
下載大小或 container 大小」比 latency 更重要，FP16 是值得優先補測的候選。

## 6. ONNX 為什麼沒有產出

目前 Kaggle Perch v2 CPU SavedModel 將 JAX graph 包裝在 TensorFlow
`XlaCallModule` 中。`tf2onnx` 在 opset 17、16、15 都無法把該
StableHLO/XLA module 轉成標準 ONNX operators。

因此：

- ONNX FP32 沒有有效 artifact。
- 沒有 ONNX FP32，便無法進行 ONNX dynamic INT8 quantization。
- 繼續只切換 opset 不太可能解決問題。
- 真正可行的 ONNX 路線可能需要原始 JAX/Flax checkpoint、另一條受支援的
  export pipeline，或官方發布的相容 ONNX artifact。

## 7. Runtime Selector 與部署設定

支援的環境變數：

```bash
TRIAGELENS_PERCH_RUNTIME=tf
TRIAGELENS_PERCH_RUNTIME=tflite
TRIAGELENS_PERCH_RUNTIME=tflite_int8
TRIAGELENS_PERCH_RUNTIME=onnx
TRIAGELENS_PERCH_RUNTIME=onnx_int8
```

目前 `onnx` 與 `onnx_int8` 沒有有效 artifact，選用時會 fallback 至
TensorFlow。

TFLite FP32 候選部署設定：

```bash
TRIAGELENS_PERCH_RUNTIME=tflite
TRIAGELENS_PERCH_TFLITE_PATH=models/perch/perch_v2_cpu_fp32.tflite
TRIAGELENS_NUM_THREADS=2
TRIAGELENS_XAI_PARALLEL=1
TRIAGELENS_INFERENCE_BATCH_PARALLEL=1
TRIAGELENS_MAX_CONCURRENT_PREDICTIONS=1
TRIAGELENS_PERCH_XAI_STRIDE_SEC=0.3
```

使用一個 Uvicorn worker，避免模型記憶體被複製。候選 Dockerfile 位於：

`backend/Dockerfile.perch_tflite_candidate`

## 8. Artifact 位置

GitHub 不包含大型 `.tflite` artifacts。NCHC 產出的模型位於：

`/staging/biology/kevinlin0411/EchoWing/artifacts/perch_cpu_optimization`

正式建議使用的 NCHC artifact：

```text
perch_v2_cpu_fp32.tflite
SHA256: 9ac770d2cfb830d83379c527e323570d42db3c39bd7336af45ea1599b094fb1b
```

完整 hash 請參考：

`reports/perch_cpu_optimization/artifact_manifest.md`

## 9. 接班後最務實的下一步

1. 不修改正式預設，先維持 `TRIAGELENS_PERCH_RUNTIME=tf`。
2. 使用少量真實鳥音比較 TensorFlow 與 TFLite FP32 的 top-k、分數與 taxonomy。
3. 若真實鳥音結果可接受，在 Hugging Face CPU 上以 opt-in TFLite 模式測試。
4. 確認記憶體、啟動時間與 Docker image 大小後，才決定是否改成預設。
5. 只有在部署大小成為主要問題時，才優先補做 FP16 的完整 benchmark。

## 10. 重要文件

- 最終建議：`reports/perch_cpu_optimization/final_recommendation.md`
- Perch 資源短評：`reports/perch_cpu_optimization/00_perch_resource_review.md`
- TFLite 轉換結果：`reports/perch_cpu_optimization/03_tflite_export.md`
- 正式 benchmark：`reports/perch_cpu_optimization/05_30s_cpu_benchmark.md`
- 輸出 sanity check：`reports/perch_cpu_optimization/06_quick_output_sanity_check.md`
- NCHC 執行方式：`reports/perch_cpu_optimization/NCHC_RUN_COMMANDS.md`
- 未處理問題：`reports/perch_cpu_optimization/problems_not_fixed.md`

請勿順手修正無關的 `backend/models/resnet18_v3_int8.onnx` Git LFS mismatch；
它已記錄於 `problems_not_fixed.md`，不屬於本次 Perch 最佳化工作。
