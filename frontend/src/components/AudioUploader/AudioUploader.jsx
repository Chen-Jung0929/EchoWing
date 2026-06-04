import React, { useState } from 'react';
import { useAudioProcessor } from '../../hooks/useAudioProcessor';
import { MEDIA_FILE_ACCEPT } from '../../utils/supportedMedia';

export default function AudioUploader({ onChunksProcessed }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const { processAudio, isProcessing, error } = useAudioProcessor();
  
  // 新增 1：建立一個 State 來儲存準備預覽的音檔
  const [previewChunks, setPreviewChunks] = useState([]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setPreviewChunks([]); // 選擇新檔案時清空舊預覽
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const chunks = await processAudio(selectedFile);
      
      // 新增：整理要傳給後端與 PDF 報告的中繼資料
      const fileInfo = {
        name: selectedFile.name,
        // 粗略計算總時長 ( Chunk 數量 * 5 秒 )
        duration: (chunks.length * 5).toFixed(1) 
      };

      if (onChunksProcessed) {
        // 將 chunks 與 fileInfo 一起傳給上層的 App.jsx
        onChunksProcessed(chunks, fileInfo);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
      {/* ... 上半部維持原樣（上傳按鈕等） ... */}
      <h3 className="text-lg font-bold text-gray-700 mb-4">上傳音訊或影片</h3>
      <p className="mb-3 text-center text-xs text-gray-500">
        支援 WAV、MP3、FLAC、OGG、M4A、AAC、WEBM 與常見影片格式
      </p>
      
      <input 
        type="file" 
        accept={MEDIA_FILE_ACCEPT}
        onChange={handleFileChange}
        className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      <button 
        onClick={handleUpload} 
        disabled={!selectedFile || isProcessing}
        className={`px-6 py-2 rounded-lg font-bold text-white transition-colors ${!selectedFile || isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {isProcessing ? '正在進行降採樣與切割...' : '開始處理並辨識'}
      </button>

      {error && <p className="text-red-500 mt-3 text-sm">{error}</p>}
      
      <p className="text-xs text-gray-400 mt-4 text-center">
        最高支援30秒音檔
      </p>

    </div>
  );
}