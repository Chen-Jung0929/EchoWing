# EchoWing Google 試算表設定

田野觀察紀錄會在使用者 **確認儲存** 時追加一列；結果頁可按 **附近紀錄** 依 GPS 半徑查詢。

## 1. 試算表欄位（schema v3，8 欄）

第一列標題：

```
observed_at	location	latitude	longitude	predicted_species	observer_name	observer_comment	model
```

| 欄位 | 說明 |
|------|------|
| `observed_at` | 觀察時間 |
| `location` | 地點文字 |
| `latitude` | 緯度（無 GPS 則空） |
| `longitude` | 經度 |
| `predicted_species` | 預測物種（Top 3，儲存格內換行） |
| `observer_name` | 記錄人 |
| `observer_comment` | 評語 |
| `model` | 模型 |

**附近紀錄查詢**僅包含 lat/lng 有效的列。舊版 6 欄資料需補座標才會出現在查詢結果。

## 2. 部署 Apps Script

1. 貼上最新 [`Code.gs`](./Code.gs)
2. 設定 `SHEET_SECRET`
3. 部署 Web App：**我** + **任何人** → **新版本**

doGet 應回傳 `"schema":"v3-8col"`。

### API

| action | 用途 |
|--------|------|
| `append`（預設） | 寫入一列 |
| `query_nearby` | 需 `latitude`, `longitude`；選填 `radius_km`（預設 5）, `limit`（預設 20） |

## 3. 前端環境變數

```env
VITE_GOOGLE_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/xxxx/exec
VITE_GOOGLE_SHEETS_SECRET=<與 SHEET_SECRET 相同>
VITE_GOOGLE_MAPS_API_KEY=<Google Maps API 金鑰>
```

## 4. Google 地圖（田野 / 附近紀錄 / 地圖選點）

地圖已改為 **Google Maps**。在 [Google Cloud Console](https://console.cloud.google.com/) 建立金鑰並啟用：

- Maps Embed API（單點互動地圖預覽）
- Maps Static API（附近紀錄總覽）
- Maps JavaScript API（田野紀錄「在地圖上選擇」）
- Geocoding API（選點後反查地址）

田野紀錄 Modal 提供兩種定位方式：**目前位置**（瀏覽器 GPS）與 **在地圖上選擇**（需上述 JS + Geocoding API）。

建議限制金鑰為你的網站 HTTP referrer。設定 `VITE_GOOGLE_MAPS_API_KEY` 後重新 build。

## 5. 驗證

1. 儲存含「目前位置」的田野紀錄 → lat/lng 有值
2. 結果頁操作選單 → **附近紀錄** → 彈窗顯示 Google 地圖與列表
3. 刪除舊資料請用 **刪除列**，避免空白列
