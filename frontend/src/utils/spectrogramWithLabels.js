import {
  computeSpectrogramCanvasSize,
  drawSpectrogramPayload,
  estimateSpectrogramDurationSec,
} from './spectrogramCache';
import { buildEventRangeSegments } from './timeline/eventRangeSegments.js';
import { getEventPeakTimes } from './timeline/mergeConsecutiveEvents.js';
import { getDict } from '../i18n';

function shiftEventsToLocalTime(events, offsetSec) {
  if (!offsetSec) return events ?? [];
  return (events ?? []).map((ev) => {
    const peaks = getEventPeakTimes(ev).map((t) => t - offsetSec);
    const onset = (ev.onset ?? ev.peakTime ?? 0) - offsetSec;
    const offset = (ev.offset ?? ev.peakTime ?? onset) - offsetSec;
    return { ...ev, onset, offset, peakTimes: peaks };
  });
}

/**
 * @param {(name: object) => string} resolveName
 */
export function drawEventLabelStrip(ctx, {
  segments,
  plotX,
  plotY,
  plotW,
  durationSec,
  resolveName = (name) => name?.zh ?? name?.en ?? '',
  laneHeight = 20,
  minStripHeight = 28,
}) {
  if (!segments?.length || !(durationSec > 0) || !(plotW > 0)) {
    return minStripHeight;
  }

  const laneCount = Math.max(...segments.map((seg) => seg.lane)) + 1;
  const stripHeight = Math.max(minStripHeight, laneCount * laneHeight + 8);

  ctx.save();
  ctx.fillStyle = 'rgba(248, 250, 252, 0.95)';
  ctx.fillRect(plotX, plotY, plotW, stripHeight);

  for (const seg of segments) {
    const spanSec = seg.end - seg.start + 1;
    const x0 = plotX + (seg.start / durationSec) * plotW;
    const x1 = plotX + ((seg.start + spanSec) / durationSec) * plotW;
    const width = Math.max(28, x1 - x0);
    const centerX = x0 + width / 2;
    const top = plotY + seg.lane * laneHeight + 4;
    const name = resolveName(seg.name);
    const shortName = name.length > 10 ? `${name.slice(0, 9)}…` : name;
    const label = `${shortName} · ${seg.rangeLabel}`;

    ctx.font = 'bold 10px Helvetica, Arial, sans-serif';
    const textW = Math.min(width - 4, ctx.measureText(label).width + 8);
    const badgeW = Math.max(36, textW);
    const badgeH = 14;
    const badgeX = centerX - badgeW / 2;

    ctx.fillStyle = seg.color;
    ctx.beginPath();
    ctx.roundRect(badgeX, top, badgeW, badgeH, 3);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, centerX, top + badgeH / 2, badgeW - 4);

    ctx.beginPath();
    ctx.moveTo(centerX - 4, top + badgeH);
    ctx.lineTo(centerX + 4, top + badgeH);
    ctx.lineTo(centerX, top + badgeH + 5);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
  }

  ctx.restore();
  return stripHeight;
}

/**
 * Render spectrogram raster with species event label strip above the plot.
 * @param {import('./spectrogramCache').SpectrogramPayload} spectrogram
 * @param {{
 *   lang?: string,
 *   title?: string,
 *   durationSec?: number,
 *   events?: object[],
 *   resolveName?: (name: object) => string,
 *   plotWidthPx?: number,
 *   plotHeightPx?: number,
 *   axisPadL?: number,
 *   axisPadB?: number,
 *   titleHeight?: number,
 *   showAxes?: boolean,
 *   showLegend?: boolean,
 *   timeOffsetSec?: number,
 * }} [options]
 */
export function renderSpectrogramWithLabels(spectrogram, options = {}) {
  if (!spectrogram?.values?.length) return null;

  const {
    lang = 'zh',
    title = '',
    durationSec = estimateSpectrogramDurationSec(spectrogram),
    events = [],
    resolveName = (name) => name?.zh ?? name?.en ?? '',
    plotWidthPx,
    plotHeightPx = 220,
    axisPadL = 42,
    axisPadB = 22,
    titleHeight = title ? 20 : 0,
    showAxes = true,
    showLegend = true,
    timeOffsetSec = 0,
  } = options;

  const localEvents = shiftEventsToLocalTime(events, timeOffsetSec);
  const segments = buildEventRangeSegments(localEvents);
  const laneCount = segments.length ? Math.max(...segments.map((s) => s.lane)) + 1 : 1;
  const labelStripH = segments.length ? Math.max(28, laneCount * 20 + 8) : 0;

  const plotPxPerFrame = Math.max(
    2,
    Math.ceil(
      (plotWidthPx ?? plotHeightPx * 2) / Math.max(1, spectrogram.time_frames)
    )
  );
  const plotSize = computeSpectrogramCanvasSize(spectrogram.time_frames, {
    height: plotHeightPx,
    pxPerFrame: plotPxPerFrame,
  });
  const resolvedPlotW = plotWidthPx ?? plotSize.width;

  const canvasW = axisPadL + resolvedPlotW;
  const canvasH = titleHeight + labelStripH + plotSize.height + axisPadB;
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (title) {
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, axisPadL, 16);
  }

  const plotY = titleHeight + labelStripH;
  if (labelStripH > 0) {
    drawEventLabelStrip(ctx, {
      segments,
      plotX: axisPadL,
      plotY: titleHeight,
      plotW: resolvedPlotW,
      durationSec,
      resolveName,
    });
  }

  const plotCtx = canvas.getContext('2d');
  plotCtx.save();
  plotCtx.translate(axisPadL, plotY);
  drawSpectrogramPayload(plotCtx, spectrogram, resolvedPlotW, plotSize.height);
  plotCtx.restore();

  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1;
  ctx.strokeRect(axisPadL, plotY, resolvedPlotW, plotSize.height);

  const dict = getDict(lang);

  if (showAxes) {
    ctx.fillStyle = '#4b5563';
    ctx.font = '11px Helvetica, Arial, sans-serif';
    const xLabel = dict.spectrogramXLabel || 'Time (seconds)';
    const yLabel = dict.spectrogramYLabel || 'Mel frequency';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, axisPadL + resolvedPlotW / 2, plotY + plotSize.height + 16);
    ctx.save();
    ctx.translate(12, plotY + plotSize.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  if (showLegend) {
    const legendX = axisPadL + resolvedPlotW - 120;
    const legendY = plotY + 6;
    ctx.font = '9px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(dict.spectrogramIntensity || 'Intensity', legendX, legendY - 2);
    const grad = ctx.createLinearGradient(legendX, legendY + 4, legendX + 100, legendY + 4);
    grad.addColorStop(0, 'rgb(15,23,42)');
    grad.addColorStop(0.35, 'rgb(59,130,246)');
    grad.addColorStop(0.7, 'rgb(251,191,36)');
    grad.addColorStop(1, 'rgb(239,68,68)');
    ctx.fillStyle = grad;
    ctx.fillRect(legendX, legendY + 4, 100, 8);
    ctx.fillStyle = '#6b7280';
    ctx.fillText('low', legendX, legendY + 22);
    ctx.textAlign = 'right';
    ctx.fillText('high', legendX + 100, legendY + 22);
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    canvas,
    nativeWidth: canvasW,
    nativeHeight: canvasH,
    plotWidthPx: resolvedPlotW,
    plotHeightPx: plotSize.height,
    labelStripH,
  };
}

/**
 * @param {object[]} events
 * @param {number} startSec
 * @param {number} endSec
 */
export function filterEventsInTimeWindow(events, startSec, endSec) {
  return (events ?? []).filter((ev) => {
    const onset = ev.onset ?? ev.peakTime ?? 0;
    const offset = ev.offset ?? ev.peakTime ?? onset;
    return onset <= endSec && offset >= startSec;
  });
}
