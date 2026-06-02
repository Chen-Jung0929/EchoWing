// 開發：vite.config.js 代理 /api → 127.0.0.1:8000
// 正式：.env.production.local 設 VITE_API_BASE=https://<space>.hf.space/api
export const API_BASE_URL = import.meta.env.VITE_API_BASE ?? '/api';

const WARMUP_POLL_MS = 5000;
const WARMUP_TIMEOUT_MS = 120_000;

/** 是否指向遠端（HF 等），而非同源 /api 代理 */
export function isRemoteApiBase() {
  const base = API_BASE_URL;
  return /^https?:\/\//i.test(base);
}

function parseErrorBody(body) {
  if (!body || typeof body !== 'object') return null;
  if (typeof body.message === 'string') return body.message;
  if (body.detail && typeof body.detail === 'object' && typeof body.detail.message === 'string') {
    return body.detail.message;
  }
  if (typeof body.detail === 'string') return body.detail;
  return null;
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

/**
 * 查詢 /api/health 或 /api/warmup 狀態
 * @returns {Promise<{ ok: boolean, ready: boolean, status: string, error?: string }>}
 */
export async function fetchBackendStatus() {
  const { response, body } = await fetchJson('/warmup');
  if (!response.ok && response.status !== 503) {
    throw new Error(parseErrorBody(body) || `伺服器回應錯誤：${response.status}`);
  }
  return body ?? { ok: false, ready: false, status: 'unknown' };
}

/**
 * 輪詢直到後端模型載入完成（HF 冷啟動 / 預熱）
 * @param {{ signal?: AbortSignal, onTick?: (payload: object) => void }} [opts]
 */
export async function waitForBackendReady(opts = {}) {
  const { signal, onTick } = opts;
  const deadline = Date.now() + WARMUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const payload = await fetchBackendStatus();
    onTick?.(payload);

    if (payload.ready) return payload;
    if (payload.status === 'error') {
      throw new Error(payload.error || '後端模型載入失敗');
    }

    await new Promise((resolve, reject) => {
      const t = window.setTimeout(resolve, WARMUP_POLL_MS);
      signal?.addEventListener(
        'abort',
        () => {
          window.clearTimeout(t);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true }
      );
    });
  }

  throw new Error('後端準備逾時，請稍後再試或確認 Hugging Face Space 是否 Running');
}

/**
 * 將音訊區塊陣列傳送至後端進行推論
 * @param {Blob[]} chunks
 * @param {Object} metadata
 * @param {{ signal?: AbortSignal }} [opts]
 */
export const analyzeAudioChunks = async (chunks, metadata, opts = {}) => {
  const { signal } = opts;

  try {
    const formData = new FormData();

    chunks.forEach((blob, index) => {
      formData.append('audio_chunks', blob, `chunk_${index}.wav`);
    });

    formData.append('original_filename', metadata.name);
    formData.append('sample_rate', 32000);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
      signal,
    });

    const errorData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg =
        parseErrorBody(errorData) ||
        (response.status === 503
          ? '分析伺服器尚未就緒，請稍候再試'
          : `伺服器回應錯誤：狀態碼 ${response.status}`);
      throw new Error(msg);
    }

    return errorData;
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error('[API Error] 音訊分析請求失敗:', error);
    throw error;
  }
};

/**
 * 將單一音訊區塊傳送至後端進行推論
 * @param {Blob} chunkBlob
 * @param {number} index
 * @param {Object} metadata
 * @param {{ signal?: AbortSignal }} [opts]
 */
export const analyzeSingleAudioChunk = async (chunkBlob, index, metadata, opts = {}) => {
  const { signal } = opts;
  try {
    const formData = new FormData();
    formData.append('audio_chunks', chunkBlob, `chunk_${index}.wav`);
    formData.append('original_filename', metadata.name);
    formData.append('sample_rate', 32000);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
      signal,
    });

    const errorData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg =
        parseErrorBody(errorData) ||
        (response.status === 503
          ? '分析伺服器尚未就緒，請稍候再試'
          : `伺服器回應錯誤：狀態碼 ${response.status}`);
      throw new Error(msg);
    }

    return errorData;
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error(`[API Error] 第 ${index} 塊音訊分析請求失敗:`, error);
    throw error;
  }
};
