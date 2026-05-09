// src/components/ReportGenerator/ReportGenerator.jsx
import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';

export default function ReportGenerator({ data, audioInfo }) {
  const reportRef = useRef();

  const handleDownload = () => {
    const element = reportRef.current;
    const opt = {
      margin: 10,
      filename: `Bird_Analysis_${data.analysis_id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 執行轉換並下載
    html2pdf().set(opt).from(element).save();
  };

  if (!data) return null;

  return (
    <div className="flex flex-col items-center mt-6">
      <button
        onClick={handleDownload}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105"
      >
        下載完整辨識報告
      </button>

      {/* 隱藏區塊：僅供 PDF 產生使用 */}
      <div className="hidden">
        <div 
          ref={reportRef} 
          className="p-10 bg-white text-gray-800 font-sans"
          style={{ width: '210mm' }} // A4 寬度
        >
          {/* 報告標頭 */}
          <header className="border-b-2 border-green-600 pb-4 mb-8">
            <h1 className="text-3xl font-bold text-green-800">鳥類聲學辨識分析報告</h1>
            <p className="text-sm text-gray-500">報告編號：{data.analysis_id} | 生成日期：{new Date().toLocaleString()}</p>
          </header>

          {/* 樣本資訊 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold bg-gray-100 p-2 mb-3">1. 樣本資訊 (Sample Information)</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><strong>原始檔名：</strong> {audioInfo?.name || '未知檔案'}</p>
              <p><strong>音訊時長：</strong> {audioInfo?.duration || '5.0'} s</p>
              <p><strong>採樣率：</strong> 32,000 Hz (Resampled)</p>
              <p><strong>音訊通道：</strong> 單聲道 (Mono-mix)</p>
            </div>
          </section>

          {/* 預測結果 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold bg-gray-100 p-2 mb-3">2. 辨識結果 (Identification Results)</h2>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2">物種名稱 (Species Name)</th>
                  <th className="py-2 text-right">信心水準 (Confidence)</th>
                </tr>
              </thead>
              <tbody>
                {data.predictions.top_species.map((s, idx) => (
                  <tr key={idx} className="border-b text-sm">
                    <td className="py-2">{s.name}</td>
                    <td className="py-2 text-right">{(s.probability * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* XAI 分析 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold bg-gray-100 p-2 mb-3">3. 可解釋性分析</h2>
            <p className="text-sm mb-4">下圖呈現 AI 模型在該 5 秒片段中的注意力分佈，深色區域代表模型判斷的關鍵依據：</p>
            <div className="flex h-16 w-full border border-gray-300">
              {data.predictions.attention_weights.map((w, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: `rgba(34, 197, 94, ${w})` }} />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 italic">* 綠色濃度代表模型在該時間點的關注權重。</p>
          </section>

          {/* 決策支援 */}
          <section className="mb-8 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-bold text-blue-900 mb-2">4. 專家決策建議</h2>
            <div className="text-sm space-y-3">
              <p><strong>風險分析：</strong> {data.decision_support.risk_analysis}</p>
              <p><strong>行動建議：</strong> {data.decision_support.action_recommendation}</p>
            </div>
          </section>

          {/* 免責聲明 */}
          <footer className="mt-12 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 leading-relaxed italic">
              {data.decision_support.disclaimer}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}