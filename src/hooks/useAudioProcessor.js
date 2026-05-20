// src/hooks/useAudioProcessor.js
import { useState } from 'react';

// 根據 Kaggle Perch 模型的需求設定常數
const TARGET_SAMPLE_RATE = 32000;
const CHUNK_DURATION = 5; // 5 秒
const MAX_DURATION = 60; // 最高 60 秒

export function useAudioProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 將 Float32Array 轉換為 WAV Blob 的輔助函式
   */
  const float32ToWavBlob = (channelData, sampleRate) => {
    const buffer = new ArrayBuffer(44 + channelData.length * 2);
    const view = new DataView(buffer);

    // 寫入 WAV 標頭 (Header)
    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + channelData.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // 單聲道 (Mono)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byteRate
    view.setUint16(32, 2, true); // blockAlign
    view.setUint16(34, 16, true); // 16-bit
    writeString(view, 36, 'data');
    view.setUint32(40, channelData.length * 2, true);

    // 將 Float32 轉換為 16-bit PCM
    let offset = 44;
    for (let i = 0; i < channelData.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  /**
   * 主要處理函式：接收 File 物件，回傳切割好的 WAV Blob 陣列
   */
  const processAudio = async (file) => {
    setIsProcessing(true);
    setError(null);

    try {
      // 1. 初始化 AudioContext 並解碼檔案
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // 2. 設定 OfflineAudioContext 進行降採樣與單聲道轉換
      // duration 限制為最大 60 秒
      const duration = Math.min(audioBuffer.duration, MAX_DURATION);
      const offlineCtx = new OfflineAudioContext(
        1, // 強制單聲道 (Mono)
        duration * TARGET_SAMPLE_RATE,
        TARGET_SAMPLE_RATE
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);

      // 開始渲染降採樣後的音訊
      const resampledBuffer = await offlineCtx.startRendering();
      const rawData = resampledBuffer.getChannelData(0); // 取得 Float32Array

      // 3. 切割為 5 秒的區段 (Chunks)
      const chunkSizeInSamples = TARGET_SAMPLE_RATE * CHUNK_DURATION;
      const chunks = [];

      for (let i = 0; i < rawData.length; i += chunkSizeInSamples) {
        let chunkData = rawData.slice(i, i + chunkSizeInSamples);

        // 如果不足 5 秒，補零 (Zero-padding)
        if (chunkData.length < chunkSizeInSamples) {
          const padded = new Float32Array(chunkSizeInSamples);
          padded.set(chunkData);
          chunkData = padded;
        }

        // 轉換為 WAV Blob 並存入陣列
        const wavBlob = float32ToWavBlob(chunkData, TARGET_SAMPLE_RATE);
        chunks.push(wavBlob);
      }

      setIsProcessing(false);
      return chunks;

    } catch (err) {
      console.error("音訊預處理失敗:", err);
      setError("無法處理該檔案，請確認是否為支援的音訊格式。");
      setIsProcessing(false);
      throw err;
    }
  };

  return { processAudio, isProcessing, error };
}