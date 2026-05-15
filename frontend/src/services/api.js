// 這裡設定後端伺服器的網址。開發期間通常是 localhost 的某個 port。
// 未來部署時，可以透過 Vite 的環境變數 ( .env ) 動態替換。
const API_BASE_URL = 'http://localhost:8000/api'; 

/**
 * 將音訊區塊陣列傳送至後端進行推論
 * @param {Blob[]} chunks - 包含 5 秒 WAV 音訊的 Blob 陣列
 * @param {Object} metadata - 關於檔案的元資料 ( Metadata )
 * @returns {Promise<Object>} 後端回傳的 JSON 預測結果
 */
export const analyzeAudioChunks = async (chunks, metadata) => {
  try {
    // 建立 FormData 物件來封裝二進位檔案
    const formData = new FormData();

    // 將所有的 Blob 附加到 FormData 中
    chunks.forEach((blob, index) => {
      // 第一個參數是後端接收的欄位名稱 ( Field Name )，請與後端工程師確認此名稱
      // 第三個參數是檔名，有助於後端排序
      formData.append('audio_chunks', blob, `chunk_${index}.wav`);
    });

    // 附加上額外的中繼資料 ( Metadata )，供後端紀錄或生成報告使用
    formData.append('original_filename', metadata.name);
    formData.append('sample_rate', 32000);

    // 發送 POST 請求
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
      // 注意：使用 fetch 搭配 FormData 時，絕對不要手動設定 'Content-Type'
      // 瀏覽器會自動幫您設定包含 boundary 的正確 multipart 標頭
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `伺服器回應錯誤：狀態碼 ${response.status}`);
    }

    // 解析並回傳後端的 JSON 預測結果
    const data = await response.json();
    return data;

  } catch (error) {
    console.error('[API Error] 音訊分析請求失敗:', error);
    throw error; // 將錯誤往上拋，交由 UI 層處理呈現
  }
};