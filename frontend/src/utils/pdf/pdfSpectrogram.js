import {
  computeSpectrogramCanvasSize,
  drawSpectrogramPayload,
} from '../spectrogramCache';
import { SPECTROGRAM_DISPLAY } from './pdfConstants';

const LEGEND_STOPS = [
  { t: 0, label: 'low' },
  { t: 0.5, label: 'mid' },
  { t: 1, label: 'high' },
];

/**
 * 依 PDF 輸出尺寸產生高解析度頻譜圖（含軸標籤與色階說明）。
 * @param {import('../spectrogramCache').SpectrogramPayload} spectrogram
 * @param {{ lang: string, segmentLabel: string, timeRange: string }} meta
 */
export function renderSpectrogramForPdf(spectrogram, meta) {
  const { widthMm, heightMm, pixelScale } = SPECTROGRAM_DISPLAY;
  const labelH = 28;
  const axisPadL = 42;
  const axisPadB = 22;

  const plotPxPerFrame = Math.max(
    4,
    Math.ceil(
      ((widthMm / 25.4) * 96 * pixelScale) / Math.max(1, spectrogram.time_frames)
    )
  );
  const plotSize = computeSpectrogramCanvasSize(spectrogram.time_frames, {
    height: Math.round((heightMm / 25.4) * 96 * pixelScale),
    pxPerFrame: plotPxPerFrame,
  });

  const canvasW = axisPadL + plotSize.width;
  const canvasH = plotSize.height + axisPadB + labelH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
  const title =
    meta.lang === 'zh'
      ? `片段 ${meta.segmentLabel} · ${meta.timeRange}`
      : `Segment ${meta.segmentLabel} · ${meta.timeRange}`;
  ctx.fillText(title, axisPadL, 16);

  const plotCtx = canvas.getContext('2d');
  if (!plotCtx) return null;
  plotCtx.save();
  plotCtx.translate(axisPadL, labelH);
  drawSpectrogramPayload(plotCtx, spectrogram, plotSize.width, plotSize.height);
  plotCtx.restore();

  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1;
  ctx.strokeRect(axisPadL, labelH, plotSize.width, plotSize.height);

  ctx.fillStyle = '#4b5563';
  ctx.font = '11px Helvetica, Arial, sans-serif';
  const xLabel =
    meta.lang === 'zh' ? '時間 (秒)' : 'Time (seconds)';
  const yLabel =
    meta.lang === 'zh' ? 'Mel 頻率' : 'Mel frequency';
  ctx.textAlign = 'center';
  ctx.fillText(xLabel, axisPadL + plotSize.width / 2, labelH + plotSize.height + 16);
  ctx.save();
  ctx.translate(12, labelH + plotSize.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  const legendX = axisPadL + plotSize.width - 120;
  const legendY = labelH + 6;
  ctx.font = '9px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6b7280';
  ctx.fillText(
    meta.lang === 'zh' ? '強度' : 'Intensity',
    legendX,
    legendY - 2
  );
  const grad = ctx.createLinearGradient(legendX, legendY + 4, legendX + 100, legendY + 4);
  grad.addColorStop(0, 'rgb(15,23,42)');
  grad.addColorStop(0.35, 'rgb(59,130,246)');
  grad.addColorStop(0.7, 'rgb(251,191,36)');
  grad.addColorStop(1, 'rgb(239,68,68)');
  ctx.fillStyle = grad;
  ctx.fillRect(legendX, legendY + 4, 100, 8);
  ctx.fillStyle = '#6b7280';
  ctx.fillText(LEGEND_STOPS[0].label, legendX, legendY + 22);
  ctx.textAlign = 'right';
  ctx.fillText(LEGEND_STOPS[2].label, legendX + 100, legendY + 22);

  const displayW = widthMm;
  const displayH = heightMm + (labelH + axisPadB) / 3.78;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    widthMm: displayW,
    heightMm: displayH,
    nativeWidth: canvasW,
    nativeHeight: canvasH,
  };
}
