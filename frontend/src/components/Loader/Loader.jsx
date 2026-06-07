// src/components/Loader/Loader.jsx
import { useRef, useEffect } from 'react';

// 定義 SVG 圓形路徑常數 (中心 120, 120, 半徑 80)
// 我們將 Motion Path 起點設為正上方 (120, 40)
const svgPathString = 'M 120 40 A 80 80 0 1 1 120 200 A 80 80 0 1 1 120 40 Z';

export default function Loader({ progress, audioBuffer }) {
  const canvasRef = useRef(null);
  const totalCircumference = 2 * Math.PI * 80; // 計算圓周長

  // 當進度改變時，利用 Canvas 繪製已處理的降採樣聲波圖
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清空畫布
    ctx.clearRect(0, 0, width, height);

    // 取得單聲道 Float32Array 訊號
    const signalData = audioBuffer.getChannelData(0);
    const numSamples = signalData.length;

    // 只繪製目前進度對應的採樣點 (模擬實時繪製)
    const samplesToDraw = Math.floor((progress / 100) * numSamples);
    
    // 計算每一根柱子對應多少個音訊採樣點
    const totalBars = width / 2; // 每 2px 畫一根
    const samplesPerBar = Math.ceil(numSamples / totalBars);
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; // 淡紅色
    ctx.beginPath();

    let currentX = 0;
    for (let i = 0; i < samplesToDraw; i += samplesPerBar) {      let offset = i;
      let peak = 0;
      for (let j = 0; j < samplesPerBar && (offset + j) < numSamples; j++) {
        const amplitude = Math.abs(signalData[offset + j]);
        if (amplitude > peak) peak = amplitude;
      }
      
      const barHeight = peak * (height / 2);
      ctx.moveTo(currentX, height / 2 - barHeight);
      ctx.lineTo(currentX, height / 2 + barHeight);
      currentX += 2;
    }
    ctx.stroke();

  }, [audioBuffer, progress]);

  return (
    <div className="flex flex-col items-center p-8 bg-[#1a2b42] rounded-3xl shadow-lg border border-white/10 relative">
      <h3 className="text-xl font-bold tracking-widest text-[#f5f5f5] mb-6">{dict?.loaderPreprocessing}...</h3>
      
      {/* 聲波圖畫布 */}
      <canvas 
        ref={canvasRef} 
        width="240" 
        height="60" 
        className="w-full h-15 opacity-60 mb-6"
      />

      <div className="relative w-60 h-60">
        {/* SVG 為 Motion Path 提供物理對齊 */}
        <svg viewBox="0 0 240 240" className="w-full h-full">
          {/* 灰色虛線背景軌道 */}
          <path 
            d={svgPathString}
            fill="none" 
            stroke="#d1d5db" // Tailwind gray-300
            strokeWidth="2" 
            strokeDasharray="5 5" 
          />
          {/* 紅色實線進度條 (dash-array/offset 做法) */}
          <path 
            d={svgPathString}
            fill="none" 
            stroke="#ef4444" // Tailwind red-500
            strokeWidth="4" 
            strokeDasharray={totalCircumference}
            // 利用進度計算 offset，實作紅色弧線跟著 Kiwi 跑的效果
            strokeDashoffset={totalCircumference - (totalCircumference * progress) / 100}
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* 🌟 核心：Kiwi 鳥 Motion Icon --- */}
        <div 
          className="absolute w-12 h-12 flex items-center justify-center p-1 bg-white/10 rounded-full transition-all duration-300 ease-out"
          style={{
            // 讓這個 <div> 的中心點對齊圓心
            transform: 'translate(-50%, -50%)',
            left: '120px', 
            top: '120px',
            // 🌟 核心 CSS：告訴它沿著這個圓形路徑移動
            offsetPath: `path('${svgPathString}')`,
            // 核心 CSS：根據 React 進度狀態，計算移動距離 (0% 到 100%)
            offsetDistance: `${progress}%`,
            // 核心 CSS：告訴它移動時身體自動對齊軌道方向
            offsetRotate: 'auto',
          }}
        >
          {/* 這裡使用 Kiwi 鳥的 EMOJI，您可以替換成美宣同學給您的 JPEG 圖片 */}
          <span className="text-4xl drop-shadow-md">🥝</span>
        </div>
        
        {/* 進度文字百分比 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-4xl font-black font-mono text-[#ef4444]">
            {Math.floor(progress)}%
          </p>
        </div>
      </div>
      
      <p className="text-xs text-gray-400 mt-6 text-center italic">
        {dict?.loaderPreprocessingHint}
      </p>
    </div>
  );
}