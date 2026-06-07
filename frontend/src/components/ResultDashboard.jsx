// src/components/ResultDashboard.jsx
import { useEffect, useState } from 'react';

export default function ResultDashboard() {
  const [resultData, setResultData] = useState(null);

  // 模擬從 public/mock_data 獲取假資料
  useEffect(() => {
    fetch('/mock_data/perch_result.json')
      .then(res => res.json())
      .then(data => setResultData(data))
      .catch(err => console.error("資料讀取失敗", err));
  }, []);

  if (!resultData) return <div>資料載入中...</div>;

  const { predictions, decision_support } = resultData;

  return (
    <div className="dashboard-container">
      <h2>聲學 AI 辨識結果與決策支援報告</h2>
      
      {/* 區塊一：XAI 視覺化 */}
      <section className="xai-section">
        <h3>AI 聽覺注意力熱力圖 (XAI Attention)</h3>
        <div className="waveform-container" style={{ display: 'flex', height: '100px', background: '#f3f4f6' }}>
          {/* 這裡模擬熱力圖疊加，後續美宣可替換為真實的波形圖背景 */}
          {predictions.attention_weights.map((weight, index) => (
            <div 
              key={index} 
              style={{
                flex: 1,
                backgroundColor: `rgba(239, 68, 68, ${weight})`, // 權重越高，紅色越深
                borderRight: '1px solid #e5e7eb'
              }}
            />
          ))}
        </div>
      </section>

      {/* 區塊二：物種預測結果 */}
      <section className="results-section">
        <h3>物種預測結果</h3>
        <ul>
          {predictions.top_species.map((species) => {
            const isHighConfidence = species.probability > 0.5;
            const cnName = species.name.split(' (')[0]; // 擷取中文名
            
            return (
              <li key={species.species_id}>
                <strong>{species.name}</strong> - {(species.probability * 100).toFixed(1)}%
                {isHighConfidence && (
                  <a 
                    href={`https://zh.wikipedia.org/wiki/${encodeURIComponent(cnName)}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ marginLeft: '10px', color: '#3b82f6' }}
                  >
                    [維基百科]
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* 區塊三：決策支援與免責聲明 */}
      <section className="decision-section" style={{ padding: '15px', background: '#eff6ff', borderRadius: '8px' }}>
        <h3>專家系統建議</h3>
        <p><strong>風險分析：</strong>{decision_support.risk_analysis}</p>
        <p><strong>行動建議：</strong>{decision_support.action_recommendation}</p>
        <hr />
        <p style={{ fontSize: '0.85em', color: '#6b7280' }}>
          {decision_support.disclaimer}
        </p>
      </section>
    </div>
  );
}