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
  const seen = new Set();
  /** @type {SpectrogramPayload[]} */
  const out = [];
  for (const c of (chunks ?? []).filter((ch) => !ch.error).sort((a, b) => a.index - b.index)) {
    const idx = c.index ?? 0;
    if (seen.has(idx)) continue;
    seen.add(idx);
    const spec = getSpectrogramFromCache(cache, idx);
    if (spec) out.push(spec);
  }
  return out;
}

/**
 * Trim spectrogram frames so the plot spans exactly durationSec (audio start → end).
 * @param {SpectrogramPayload} spec
 * @param {number} durationSec
 */
export function trimSpectrogramToDuration(spec, durationSec) {
  if (!spec?.values?.length || !(durationSec > 0)) return spec;
  const estimated = estimateSpectrogramDurationSec(spec);
  if (estimated <= 0) return spec;
  const keepFrames = Math.max(
    1,
    Math.min(spec.time_frames, Math.round((durationSec / estimated) * spec.time_frames))
  );
  if (keepFrames === spec.time_frames) return spec;
  return {
    ...spec,
    time_frames: keepFrames,
    values: spec.values.slice(0, keepFrames),
  };
}

/**
 * Stitch display-aligned chunk spectrograms to exactly [0, totalDurationSec).
 * @param {Array<{ index?: number }>} chunks
 * @param {Map<number, SpectrogramPayload> | Record<number, SpectrogramPayload>} cache
 * @param {number} totalDurationSec
 * @param {number} windowSec
 * @returns {SpectrogramPayload | null}
 */
export function concatSpectrogramsToAudioDuration(
  chunks,
  cache,
  totalDurationSec,
  windowSec
) {
  if (!(totalDurationSec > 0)) {
    return concatSpectrogramPayloads(collectSpectrogramsFromChunks(chunks, cache));
  }

  const sorted = (chunks ?? [])
    .filter((c) => !c.error)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  /** @type {number[][]} */
  const values = [];
  let template = null;

  for (const chunk of sorted) {
    const startSec = chunk.index ?? 0;
    if (startSec >= totalDurationSec) continue;

    const spec = getSpectrogramFromCache(cache, startSec);
    if (!spec?.values?.length) continue;

    const segmentSec = Math.min(windowSec, totalDurationSec - startSec);
    const trimmed = trimSpectrogramToDuration(spec, segmentSec);
    values.push(...trimmed.values);
    template = trimmed;
  }

  if (!values.length || !template) return null;

  return {
    time_frames: values.length,
    freq_bins: template.freq_bins,
    sample_rate: template.sample_rate ?? 32_000,
    hop_length: template.hop_length ?? 512,
    n_fft: template.n_fft ?? 2048,
    fmax_hz: template.fmax_hz ?? 16_000,
    values,
  };
}

/**
 * @param {number[]} heatmap
 * @param {number} targetFrames
 */
export function resampleHeatmapToFrames(heatmap, targetFrames) {
  if (!heatmap?.length || !targetFrames) return [];
  if (heatmap.length === targetFrames) return heatmap;
  const out = [];
  for (let t = 0; t < targetFrames; t++) {
    const src = (t / targetFrames) * heatmap.length;
    const i0 = Math.floor(src);
    const i1 = Math.min(heatmap.length - 1, i0 + 1);
    const f = src - i0;
    out.push(heatmap[i0] * (1 - f) + heatmap[i1] * f);
  }
  return out;
}

/**
 * Stitch per-chunk XAI heatmaps onto one timeline aligned to spectrogram frames.
 * @param {Array<{ index?: number, predictions?: { xai_heatmap?: number[] } }>} chunks
 * @param {number} targetFrames
 * @param {number} totalDurationSec
 * @param {number} windowSec analysis window length in seconds
 */
export function stitchXaiHeatmap(chunks, targetFrames, totalDurationSec, windowSec = 5) {
  const list = (chunks ?? [])
    .filter((c) => !c.error && c.predictions?.xai_heatmap?.length)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  if (!list.length || !(totalDurationSec > 0) || !targetFrames) return null;

  const accum = new Float32Array(targetFrames);
  const counts = new Uint16Array(targetFrames);

  for (const c of list) {
    const hm = c.predictions.xai_heatmap;
    const chunkStart = c.index ?? 0;
    const chunkDur = Math.min(windowSec, Math.max(0.001, totalDurationSec - chunkStart));
    for (let i = 0; i < hm.length; i++) {
      const timeSec = chunkStart + ((i + 0.5) / hm.length) * chunkDur;
      if (timeSec > totalDurationSec) break;
      const frame = Math.min(
        targetFrames - 1,
        Math.floor((timeSec / totalDurationSec) * targetFrames)
      );
      accum[frame] += hm[i];
      counts[frame] += 1;
    }
  }

  if (!counts.some((n) => n > 0)) return null;

  return Array.from(accum, (v, i) => (counts[i] > 0 ? v / counts[i] : 0));
}

/** XAI 時間重要性條：canvas 像素高度（繪製解析度） */
export const XAI_STRIP_CANVAS_HEIGHT = 40;

/**
 * 在頻譜圖正下方獨立區塊：半透明底 + 白色尖峰（由頂部 y=0 往下長）。
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[]} heatmap normalized 0..1
 * @param {number} width
 * @param {number} height
 */
export function drawXaiStripBelow(ctx, heatmap, width, height) {
  if (!heatmap?.length || !width || !height) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0.5);
  ctx.lineTo(width, 0.5);
  ctx.stroke();

  const n = heatmap.length;
  const max = Math.max(...heatmap, 1e-6);
  const cellW = width / n;
  const maxBarH = height - 2;

  for (let i = 0; i < n; i++) {
    const t = heatmap[i] / max;
    if (t < 0.03) continue;
    const barH = Math.max(1, t * maxBarH);
    const alpha = 0.6 + t * 0.4;
    ctx.fillStyle = `rgba(255, 94, 0, ${alpha})`;
    ctx.fillRect(i * cellW + 0.5, 1, Math.max(1, cellW - 1), barH);
  }
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
