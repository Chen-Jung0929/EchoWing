/** @typedef {{ time_frames: number, freq_bins: number, values: number[][], hop_length?: number, sample_rate?: number }} SpectrogramPayload */

/** 分頁頻譜顯示：每 time frame 對應的 canvas 像素 */
export const SPECTROGRAM_CANVAS_HEIGHT = 220;
export const PX_PER_TIME_FRAME = 2;

/**
 * @param {number} timeFrames
 * @param {{ height?: number, pxPerFrame?: number }} [opts]
 */
export function computeSpectrogramCanvasSize(
  timeFrames,
  { height = SPECTROGRAM_CANVAS_HEIGHT, pxPerFrame = PX_PER_TIME_FRAME } = {}
) {
  return {
    width: Math.max(1, Math.round(timeFrames * pxPerFrame)),
    height,
  };
}

/**
 * 依 hop / sample rate 估算秒數。
 * @param {SpectrogramPayload} spec
 */
export function estimateSpectrogramDurationSec(spec) {
  const hop = spec.hop_length ?? 512;
  const sr = spec.sample_rate ?? 32_000;
  return (spec.time_frames * hop) / sr;
}

/**
 * 橫向拼接多段頻譜（時間軸相連，頻率軸對齊）。
 * @param {SpectrogramPayload[]} spectrograms
 * @returns {SpectrogramPayload | null}
 */
export function concatSpectrogramPayloads(spectrograms) {
  const sorted = (spectrograms ?? []).filter(Boolean);
  if (!sorted.length) return null;

  const freqBins = sorted[0].freq_bins;
  /** @type {number[][]} */
  const values = [];

  for (const spec of sorted) {
    if (!spec.values?.length || spec.freq_bins !== freqBins) continue;
    values.push(...spec.values);
  }

  if (!values.length) return null;

  return {
    time_frames: values.length,
    freq_bins: freqBins,
    sample_rate: sorted[0].sample_rate ?? 32_000,
    hop_length: sorted[0].hop_length ?? 512,
    n_fft: sorted[0].n_fft ?? 2048,
    fmax_hz: sorted[0].fmax_hz ?? 16_000,
    values,
  };
}

/**
 * @param {Array<{ index: number, spectrogram?: SpectrogramPayload }>} chunks
 * @param {Map<number, SpectrogramPayload> | Record<number, SpectrogramPayload>} cache
 */
export function collectSpectrogramsFromChunks(chunks, cache) {
  return (chunks ?? [])
    .filter((c) => !c.error)
    .sort((a, b) => a.index - b.index)
    .map((c) => getSpectrogramFromCache(cache, c.index))
    .filter(Boolean);
}

/**
 * 由 API 回應建立 chunk index → spectrogram 暫存物件（供 React state）。
 * @param {Array<{ index: number, spectrogram?: SpectrogramPayload }>} chunks
 * @returns {Record<number, SpectrogramPayload>}
 */
export function buildSpectrogramCache(chunks) {
  /** @type {Record<number, SpectrogramPayload>} */
  const cache = {};
  for (const chunk of chunks ?? []) {
    if (chunk?.spectrogram) {
      cache[chunk.index] = chunk.spectrogram;
    }
  }
  return cache;
}

/**
 * @param {Map<number, SpectrogramPayload> | Record<number, SpectrogramPayload>} cache
 * @param {number} chunkIndex
 */
export function getSpectrogramFromCache(cache, chunkIndex) {
  if (cache instanceof Map) {
    return cache.get(chunkIndex) ?? null;
  }
  if (cache && typeof cache === 'object') {
    return cache[chunkIndex] ?? null;
  }
  return null;
}

const PALETTE = [
  [15, 23, 42],
  [30, 58, 138],
  [59, 130, 246],
  [125, 211, 252],
  [254, 243, 199],
  [251, 191, 36],
  [239, 68, 68],
];

function magnitudeToRgb(norm) {
  const t = Math.max(0, Math.min(1, norm));
  const idx = t * (PALETTE.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(PALETTE.length - 1, lo + 1);
  const f = idx - lo;
  const a = PALETTE[lo];
  const b = PALETTE[hi];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/**
 * 將後端 mel 頻譜 payload 繪製至 canvas（純 RGB，避免 oklch）。
 * @param {CanvasRenderingContext2D} ctx
 * @param {SpectrogramPayload} spectrogram
 * @param {number} width
 * @param {number} height
 */
export function drawSpectrogramPayload(ctx, spectrogram, width, height) {
  const { values, time_frames: timeFrames, freq_bins: freqBins } = spectrogram;
  if (!values?.length || !timeFrames || !freqBins) return;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const cellW = width / timeFrames;
  const cellH = height / freqBins;

  for (let t = 0; t < timeFrames; t++) {
    const row = values[t];
    if (!row) continue;
    for (let f = 0; f < freqBins; f++) {
      const norm = (row[f] ?? 0) / 255;
      const [r, g, b] = magnitudeToRgb(norm);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      const y = height - (f + 1) * cellH;
      ctx.fillRect(t * cellW, y, Math.max(1, cellW), Math.max(1, cellH));
    }
  }
}

/**
 * html2canvas 不支援 oklch：在 clone 文件移除 stylesheet 並強制 RGB。
 * @param {Document} clonedDoc
 * @param {HTMLElement} rootEl
 */
export function sanitizeCloneForHtml2Canvas(clonedDoc, rootEl) {
  clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    node.remove();
  });

  const stack = [rootEl];
  while (stack.length) {
    const el = stack.pop();
    if (!el || el.nodeType !== 1) continue;
    el.style.setProperty('color', '#1f2937', 'important');
    el.style.setProperty('border-color', '#d1d5db', 'important');
    if (el === rootEl) {
      el.style.setProperty('background-color', '#ffffff', 'important');
    }
    for (const child of el.children) {
      stack.push(child);
    }
  }
}
