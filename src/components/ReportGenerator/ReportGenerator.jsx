// src/components/ReportGenerator/ReportGenerator.jsx
import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
// 1. 引入我們做好的 Visualizer
import Visualizer from '../Visualizer/Visualizer';

// 2. 接收 audioChunk
export default function ReportGenerator({ data, audioInfo, audioChunk }) {
  const reportRef = useRef();

  const handleDownload = () => {
    const element = reportRef.current;
    const opt = {
      margin: 10,
      filename: `Bird_Analysis_${data.analysis_id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: 'css', avoid: ['section', 'footer'] }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (!data) return null;

  return (
    <div className="flex flex-col items-center mt-6">
      <button
        onClick={handleDownload}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105"
      >
        📥 下載完整辨識報告 (PDF)
      </button>

      {/* 將報告藏在螢幕外，避免被切斷，並加上 break-words */}
      <div className="absolute top-[-9999px] left-[-9999px] overflow-hidden opacity-0 pointer-events-none">
        <div 
          ref={reportRef} 
          className="p-8 bg-white text-gray-800 font-sans break-words"
          style={{ width: '190mm' }}
        >
          {/* --- 報告標頭與樣本資訊維持不變 --- */}
          <header className="border-b-2 border-green-600 pb-4 mb-8">
            <h1 className="text-3xl font-bold text-green-800">鳥類聲學辨識分析報告</h1>
            <p className="text-sm text-gray-500">報告編號：{data.analysis_id} | 生成日期：{new Date().toLocaleString()}</p>
          </header>

          <section className="mb-8 break-inside-avoid">
            <h2 className="text-xl font-bold bg-gray-100 p-2 mb-3">1. 樣本資訊 (Sample Information)</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><strong>原始檔名：</strong> {audioInfo?.name || '未知檔案'}</p>
              <p><strong>音訊時長：</strong> {audioInfo?.duration || '5.0'} s</p>
              <p><strong>採樣率：</strong> 32,000 Hz (Resampled)</p>
              <p><strong>音訊通道：</strong> 單聲道 (Mono-mix)</p>
            </div>
          </section>

          <section className="mb-8 break-inside-avoid">
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

          {/* --- 3. 可解釋性分析：替換為真實波形圖 --- */}
          <section className="mb-8 break-inside-avoid">
            <h2 className="text-xl font-bold bg-gray-100 p-2 mb-3">3. 可解釋性分析 (Explainability - XAI)</h2>
            <p className="text-sm mb-4 text-justify leading-relaxed">
              下圖呈現 AI 模型在該 5 秒片段中的注意力分佈與原始聲波 (Waveform) 的疊加關係。紅色熱力區域代表模型判斷物種的關鍵聲學特徵 (Acoustic Features) 所在位置：
            </p>
            
            {/* 判斷如果有音訊檔案，就畫出 Visualizer */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {audioChunk ? (
                <Visualizer 
                  audioBlob={audioChunk} 
                  attentionWeights={data.predictions.attention_weights} 
                  chunkIndex={0} 
                />
              ) : (
                <div className="p-10 text-center text-gray-400">音訊資料載入中...</div>
              )}
            </div>
          </section>

          {/* --- 4. 決策支援與免責聲明維持不變 (已加上 text-justify) --- */}
          <section className="mb-8 p-5 border-2 border-blue-200 bg-blue-50 rounded-lg break-inside-avoid">
            <h2 className="text-xl font-bold text-blue-900 mb-3">4. 專家決策建議 (Decision Support)</h2>
            <div className="text-sm space-y-4 text-justify leading-relaxed text-blue-900">
              <p><strong>風險分析：</strong> {data.decision_support.risk_analysis}</p>
              <p><strong>行動建議：</strong> {data.decision_support.action_recommendation}</p>
            </div>
          </section>

          <footer className="mt-12 pt-6 border-t border-gray-200 text-center break-inside-avoid">
            <p className="text-xs text-gray-500 leading-relaxed italic text-justify">
              {data.decision_support.disclaimer}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}