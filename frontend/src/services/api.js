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
  let body;
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
  const { response, body } = await fetchJson('/health');
  if (!response.ok && response.status !== 503) {
    const msg = parseErrorBody(body);
    if (msg) throw new Error(msg);
    const err = new Error('ERR_SERVER_HTTP_ERROR');
    err.code = 'ERR_SERVER_HTTP_ERROR';
    err.status = response.status;
    throw err;
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
  let warmupRequested = false;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (!warmupRequested) {
      await fetchJson('/warmup');
      warmupRequested = true;
    }

    const payload = await fetchBackendStatus();
    onTick?.(payload);

    if (payload.ready) return payload;
    if (payload.status === 'error') {
      const err = new Error('ERR_BACKEND_MODEL_FAILED');
      err.code = 'ERR_BACKEND_MODEL_FAILED';
      err.detail = payload.error;
      throw err;
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

  const err = new Error('ERR_BACKEND_TIMEOUT');
  err.code = 'ERR_BACKEND_TIMEOUT';
  throw err;
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
      const msg = parseErrorBody(errorData);
      if (msg) throw new Error(msg);
      
      const code = response.status === 503 ? 'ERR_SERVER_NOT_READY' : 'ERR_SERVER_HTTP_ERROR';
      const err = new Error(code);
      err.code = code;
      err.status = response.status;
      throw err;
    }

    return errorData;
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error('[API Error] 音訊分析請求失敗:', error);
    throw error;
  }
};

export const analyzeAudioFile = async (file, metadata, modelSelection = 'birdnet', opts = {}) => {
  const { signal } = opts;
  try {
    const formData = new FormData();
    formData.append('audio_chunks', file, file.name);
    formData.append('original_filename', metadata.name);
    formData.append('sample_rate', 32000);
    formData.append('model_selection', modelSelection);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
      signal,
    });

    const errorData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = parseErrorBody(errorData);
      if (msg) throw new Error(msg);
      
      const code = response.status === 503 ? 'ERR_SERVER_NOT_READY' : 'ERR_SERVER_HTTP_ERROR';
      const err = new Error(code);
      err.code = code;
      err.status = response.status;
      throw err;
    }

    return errorData;
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error(`[API Error] 音訊分析請求失敗:`, error);
    throw error;
  }
};

/**
 * 讀取後端的 SSE 串流以接收 1 秒滑移的分析結果
 * @param {Blob} file
 * @param {Object} metadata
 * @param {string | {
 *   modelSelection?: string,
 *   onChunk: (data: object) => void,
 *   signal?: AbortSignal,
 * }} modelOrOptions - 模型名稱，或 options 物件（建議）
 * @param {(data: object) => void} [onChunk]
 * @param {{ signal?: AbortSignal }} [opts]
 */
export const analyzeAudioStream = async (
  file,
  metadata,
  modelOrOptions = 'birdnet',
  onChunk,
  opts = {}
) => {
  let modelSelection = 'birdnet';
  let chunkHandler = onChunk;
  let signal;

  if (
    modelOrOptions &&
    typeof modelOrOptions === 'object' &&
    typeof modelOrOptions.onChunk === 'function'
  ) {
    modelSelection = modelOrOptions.modelSelection ?? 'birdnet';
    chunkHandler = modelOrOptions.onChunk;
    signal = modelOrOptions.signal;
  } else if (typeof modelOrOptions === 'function') {
    chunkHandler = modelOrOptions;
    signal = onChunk?.signal ?? opts?.signal;
  } else {
    modelSelection = modelOrOptions ?? 'birdnet';
    chunkHandler = onChunk;
    signal = opts?.signal;
  }

  if (typeof chunkHandler !== 'function') {
    const err = new Error('ERR_STREAM_CALLBACK_REQUIRED');
    err.code = 'ERR_STREAM_CALLBACK_REQUIRED';
    throw err;
  }

  try {
    const formData = new FormData();
    formData.append('audio_chunks', file, file.name);
    formData.append('original_filename', metadata.name);
    formData.append('sample_rate', 32000);
    formData.append('model_selection', modelSelection);

    const response = await fetch(`${API_BASE_URL}/stream-predict`, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      let msg = null;
      try {
        const errorData = await response.json();
        msg = parseErrorBody(errorData);
      } catch {
        // Ignored
      }
      if (msg) throw new Error(msg);
      
      const code = response.status === 503 ? 'ERR_SERVER_NOT_READY' : 'ERR_SERVER_HTTP_ERROR';
      const err = new Error(code);
      err.code = code;
      err.status = response.status;
      throw err;
    }

    // 處理 SSE 串流
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let streamDone = false;

    const dispatchSseBlocks = (blocks) => {
      for (const block of blocks) {
        if (!block.startsWith('data: ')) continue;
        const dataStr = block.substring(6).trim();
        if (!dataStr) continue;
        try {
          const data = JSON.parse(dataStr);
          if (data.event === 'done') {
            streamDone = true;
            continue;
          }
          chunkHandler(data);
        } catch (e) {
          console.error('JSON Parse error in stream:', e, dataStr);
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        dispatchSseBlocks(lines);
      }
      if (done) {
        buffer += decoder.decode();
        if (buffer.trim()) {
          dispatchSseBlocks([buffer]);
          buffer = '';
        }
        break;
      }
      if (streamDone) break;
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error(`[API Error] 音訊串流分析請求失敗:`, error);
    throw error;
  }
};
