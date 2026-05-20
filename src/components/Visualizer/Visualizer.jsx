// src/components/Visualizer/Visualizer.jsx
import React, { useRef, useEffect } from 'react';

const COLOR_GRAY = '#d1d5db';
const COLOR_FOCUS_BASE = 'rgba(239, 68, 68'; 
const BAR_WIDTH = 3;
const BAR_GAP = 1;

// 參數改為接收 audioBlob
export default function Visualizer({ audioBlob, attentionWeights, chunkIndex }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!audioBlob || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 建立一個非同步函式來處理音訊解碼與繪製
    const drawWaveform = async () => {
      ctx.clearRect(0, 0, width, height);

      try {
        // 1. 將 Blob 解碼為 AudioBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // 2. 數據預處理
        const signalData = audioBuffer.getChannelData(0);
        const numSamples = signalData.length;
        const weightsArray = attentionWeights || [];

        const totalBars = Math.floor(width / (BAR_WIDTH + BAR_GAP));
        const samplesPerBar = Math.ceil(numSamples / totalBars);
        const barsPerWeight = weightsArray.length > 0 ? Math.floor(totalBars / weightsArray.length) : totalBars;

        // 3. 開始層疊繪製
        let currentX = 0;

        for (let i = 0; i < totalBars; i++) {
          let offset = i * samplesPerBar;
          let peak = 0;
          for (let j = 0; j < samplesPerBar && (offset + j) < numSamples; j++) {
            const amplitude = Math.abs(signalData[offset + j]);
            if (amplitude > peak) peak = amplitude;
          }

          const barHeight = peak * (height / 2);
          const weightIndex = Math.floor(i / barsPerWeight);
          const weight = weightsArray[weightIndex] || 0;

          // 權重轉換為顏色透明度 (Alpha)
          let barColor = weightsArray.length === 0 
            ? COLOR_GRAY 
            : `${COLOR_FOCUS_BASE}, ${weight * 1.0})`;

          ctx.fillStyle = barColor;
          const centerY = height / 2;
          ctx.fillRect(currentX, centerY - barHeight, BAR_WIDTH, barHeight * 2);

          currentX += BAR_WIDTH + BAR_GAP;
        }
      } catch (err) {
        console.error("波形解碼與繪製失敗:", err);
      }
    };

    drawWaveform();

  }, [audioBlob, attentionWeights, chunkIndex]);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-700">XAI 聲波注意力熱力圖</h3>
        <span className="text-xs text-gray-400 font-mono">片段 {chunkIndex + 1} | 5.0s | 32kHz | Mono</span>
      </div>
      
      <canvas 
        ref={canvasRef} 
        width="800" 
        height="120" 
        className="w-full h-32 border border-gray-200 rounded bg-gray-50"
      />
      
      <p className="text-sm text-gray-500 mt-3 text-right">越深的紅色代表 AI 模型在辨識時的關注度越高</p>
    </div>
  );
}