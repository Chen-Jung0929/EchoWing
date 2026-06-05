# BirdCLEF 前端

React + Vite + Tailwind CSS 介面。完整說明（安裝、API、環境變數）請見專案根目錄 [README.md](../README.md)。

## 開發

```bash
npm install
npm run dev
```

需同時啟動後端（預設 `http://127.0.0.1:8000`），開發伺服器會將 `/api` 代理至後端。**不必**設定 `VITE_API_BASE`。

## 連線 Hugging Face 後端（DEMO 建置）

1. 複製 `.env.production.example` 為 `.env.production.local`
2. 將 `VITE_API_BASE` 改成你的 Space URL（結尾為 `/api`），例如：  
   `https://rin030-echowing-backend.hf.space/api`
3. 建置：`npm run build`，部署 `dist/` 至靜態主機

建置後前端會在辨識前自動輪詢 `/api/warmup`，直到 HF 模型載入完成。

## 分享功能

手機僅顯示「分享到...」（系統分享）；電腦提供 Threads、X、Facebook 與複製文字（不含 Instagram）。詳見根目錄 [README.md](../README.md)「結果分享」一節。

## 指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 開發伺服器 |
| `npm run build` | 正式版建置 |
| `npm run preview` | 預覽建置結果 |
| `npm run lint` | ESLint |
