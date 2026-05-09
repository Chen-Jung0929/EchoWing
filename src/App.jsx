import React, { useState } from 'react';
import AudioUploader from "./components/AudioUploader/AudioUploader";
import ResultDashboard from "./components/ResultDashboard";
import ReportGenerator from "./components/ReportGenerator";

function App() {
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleChunksProcessed = (chunks) => {
    console.log("開始傳送至後端... (目前先載入假資料測試)");
    // 這裡未來會接 fetch()。目前我們先載入 public/mock_data 的資料
    fetch('/mock_data/perch_result.json')
      .then(res => res.json())
      .then(data => setAnalysisResult(data));
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-10">
        <h1 className="text-4xl font-black text-center text-gray-800">Bird聲學辨識系統</h1>
        
        {/* 第一步：上傳與處理 */}
        <AudioUploader onChunksProcessed={handleChunksProcessed} />

        {/* 第二步：顯示結果與匯出報告 */}
        {analysisResult && (
          <>
            <ResultDashboard />
            <ReportGenerator data={analysisResult} audioInfo={{ name: "測試樣本.wav", duration: "5.0" }} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;