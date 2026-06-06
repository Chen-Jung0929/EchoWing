import { SPECTROGRAM_DISPLAY } from './pdfConstants';
import { renderSpectrogramWithLabels } from '../spectrogramWithLabels';
import { pickLocalized } from './pdfFonts';

/**
 * 依 PDF 輸出尺寸產生高解析度頻譜圖（含物種事件標籤、軸標籤與色階說明）。
 * @param {import('../spectrogramCache').SpectrogramPayload} spectrogram
 * @param {{
 *   lang: string,
 *   segmentLabel?: string,
 *   timeRange?: string,
 *   durationSec?: number,
 *   events?: object[],
 *   timeOffsetSec?: number,
 *   title?: string,
 * }} meta
 */
export function renderSpectrogramForPdf(spectrogram, meta) {
  const { widthMm, heightMm, pixelScale } = SPECTROGRAM_DISPLAY;
  const plotHeightPx = Math.round((heightMm / 25.4) * 96 * pixelScale);
  const plotWidthPx = Math.round((widthMm / 25.4) * 96 * pixelScale);

  const title =
    meta.title ??
    (meta.segmentLabel && meta.timeRange
      ? meta.lang === 'zh'
        ? `片段 ${meta.segmentLabel} · ${meta.timeRange}`
        : `Segment ${meta.segmentLabel} · ${meta.timeRange}`
      : meta.lang === 'zh'
        ? '全段頻譜圖'
        : 'Full recording spectrogram');

  const rendered = renderSpectrogramWithLabels(spectrogram, {
    lang: meta.lang,
    title,
    durationSec: meta.durationSec,
    events: meta.events ?? [],
    timeOffsetSec: meta.timeOffsetSec ?? 0,
    resolveName: (name) => pickLocalized(name, meta.lang),
    plotWidthPx,
    plotHeightPx,
    showAxes: true,
    showLegend: true,
  });

  if (!rendered) return null;

  const displayH = heightMm + (rendered.labelStripH + 22) / 3.78;

  return {
    dataUrl: rendered.dataUrl,
    widthMm,
    heightMm: displayH,
    nativeWidth: rendered.nativeWidth,
    nativeHeight: rendered.nativeHeight,
  };
}
