import { drawSpectrogramPayload } from './spectrogramCache';
import { renderSpectrogramWithLabels } from './spectrogramWithLabels';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} token
 * @param {number} maxWidth
 */
function breakLongToken(ctx, token, maxWidth) {
  if (ctx.measureText(token).width <= maxWidth) return [token];
  const parts = [];
  let current = '';
  for (const ch of token) {
    const next = current + ch;
    if (ctx.measureText(next).width > maxWidth && current) {
      parts.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 * @param {number} lineHeight
 * @param {number} [maxLines]
 * @returns {number}
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
  const paragraphs = String(text).split('\n');
  let cursorY = y;
  let lineCount = 0;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let line = '';

    const flushLine = (content) => {
      if (!content || lineCount >= maxLines) return false;
      ctx.fillText(content, x, cursorY);
      cursorY += lineHeight;
      lineCount += 1;
      return lineCount < maxLines;
    };

    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      const tokens = breakLongToken(ctx, word, maxWidth);

      for (const token of tokens) {
        const testLine = line ? `${line} ${token}` : token;
        if (ctx.measureText(testLine).width > maxWidth && line) {
          if (!flushLine(line)) return cursorY;
          line = token;
        } else {
          line = testLine;
        }
      }
    }

    if (line && lineCount < maxLines) {
      const truncated =
        lineCount === maxLines - 1 && ctx.measureText(`${line}…`).width <= maxWidth
          ? `${line}…`
          : line;
      flushLine(truncated);
    } else if (line && lineCount >= maxLines) {
      return cursorY;
    }
  }

  return cursorY;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./spectrogramCache').SpectrogramPayload} spectrogram
 * @param {object[]} [events]
 * @param {number} [durationSec]
 * @param {(name: object) => string} [resolveName]
 * @param {number} [timeOffsetSec]
 */
function drawSpectrogramInset(
  ctx,
  spectrogram,
  x,
  y,
  w,
  h,
  {
    opacity = 1,
    events = [],
    durationSec = 0,
    resolveName = (name) => name?.zh ?? name?.en ?? '',
    timeOffsetSec = 0,
  } = {}
) {
  const plotH = Math.max(1, Math.round(h * 0.68));
  const rendered = renderSpectrogramWithLabels(spectrogram, {
    events,
    durationSec: durationSec > 0 ? durationSec : undefined,
    resolveName,
    plotWidthPx: Math.max(1, Math.round(w)),
    plotHeightPx: plotH,
    showAxes: false,
    showLegend: false,
    timeOffsetSec,
  });

  if (rendered?.canvas) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(rendered.canvas, x, y, w, h);
    ctx.restore();
    return;
  }

  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(w));
  off.height = Math.max(1, Math.round(h));
  const offCtx = off.getContext('2d');
  if (!offCtx) return;

  drawSpectrogramPayload(offCtx, spectrogram, off.width, off.height);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(off, x, y, w, h);
  ctx.restore();
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.tabLabel
 * @param {string} opts.filename
 * @param {string} opts.modelLabel
 * @param {Array<{ name: string, pct: number }>} opts.speciesItems
 * @param {string} opts.url
 * @param {import('../i18n').LocaleMessages} opts.dict
 * @param {import('./spectrogramCache').SpectrogramPayload | null} [opts.spectrogram]
 * @param {object[]} [opts.events]
 * @param {number} [opts.durationSec]
 * @param {(name: object) => string} [opts.resolveName]
 * @param {number} [opts.timeOffsetSec]
 */
export function renderShareImageCard({
  title,
  tabLabel,
  filename,
  modelLabel = '',
  speciesItems,
  url,
  dict,
  spectrogram = null,
  events = [],
  durationSec = 0,
  resolveName,
  timeOffsetSec = 0,
}) {
  const width = 1080;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported');

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#e9d5cc');
  bg.addColorStop(1, '#d8c8b7');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(57, 77, 101, 0.08)';
  ctx.beginPath();
  ctx.arc(width * 0.82, height * 0.18, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#394d65';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText(title, 80, 120);

  ctx.font = '600 34px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(57, 77, 101, 0.72)';
  ctx.fillText(tabLabel, 80, 180);

  ctx.font = '500 28px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(57, 77, 101, 0.55)';
  const sourceLine = `${dict.sourceFile}: ${filename}`;
  let metaY = wrapText(ctx, sourceLine, 80, 230, width - 160, 36);
  if (modelLabel) {
    metaY = wrapText(
      ctx,
      `${dict.modelUsed}: ${modelLabel}`,
      80,
      metaY + 8,
      width - 160,
      36
    );
  }

  const panelX = 72;
  const panelY = modelLabel ? 340 : 300;
  const panelW = width - 144;
  const panelH = 520;
  const specStripH = spectrogram ? 196 : 0;
  const speciesMaxItems = spectrogram ? 3 : 5;
  const speciesRowH = spectrogram ? 76 : 88;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(57, 77, 101, 0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.fill();
  ctx.stroke();

  const specStripY = panelY + panelH - specStripH;

  if (spectrogram) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX, specStripY, panelW, specStripH);
    ctx.clip();
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(panelX, specStripY, panelW, specStripH);
    drawSpectrogramInset(
      ctx,
      spectrogram,
      panelX + 12,
      specStripY + 36,
      panelW - 24,
      specStripH - 48,
      {
        opacity: 1,
        events,
        durationSec,
        resolveName,
        timeOffsetSec,
      }
    );
    ctx.restore();

    ctx.strokeStyle = 'rgba(57, 77, 101, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 16, specStripY);
    ctx.lineTo(panelX + panelW - 16, specStripY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(57, 77, 101, 0.55)';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(dict.spectrogramTitle, panelX + 24, specStripY + 28);
  }

  ctx.fillStyle = '#394d65';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(dict.topSpecies, panelX + 40, panelY + 56);

  const items = speciesItems?.length
    ? speciesItems.slice(0, speciesMaxItems)
    : [{ name: dict.noSpeciesHint, pct: 0 }];

  const speciesBottom = specStripH > 0 ? specStripY - 12 : panelY + panelH - 24;
  let itemY = panelY + 108;

  for (const item of items) {
    if (itemY + 20 > speciesBottom) break;

    ctx.font = '600 36px system-ui, sans-serif';
    ctx.fillStyle = '#394d65';
    const nameMaxW = panelW - 200;
    let name = item.name;
    if (ctx.measureText(name).width > nameMaxW) {
      while (name.length > 1 && ctx.measureText(`${name}…`).width > nameMaxW) {
        name = name.slice(0, -1);
      }
      name = `${name}…`;
    }
    ctx.fillText(name, panelX + 40, itemY);

    if (item.pct > 0) {
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillStyle = '#7e98a7';
      ctx.textAlign = 'right';
      ctx.fillText(`${item.pct}%`, panelX + panelW - 40, itemY);
      ctx.textAlign = 'left';

      const barY = itemY + 14;
      const barW = panelW - 80;
      ctx.fillStyle = 'rgba(126, 152, 167, 0.2)';
      roundRect(ctx, panelX + 40, barY, barW, 12, 6);
      ctx.fill();
      ctx.fillStyle = '#7e98a7';
      roundRect(ctx, panelX + 40, barY, (barW * item.pct) / 100, 12, 6);
      ctx.fill();
    }

    itemY += speciesRowH;
  }

  const urlY = panelY + panelH + 36;
  const watermarkY = height - 56;
  const urlMaxLines = Math.max(
    2,
    Math.floor((watermarkY - urlY - 16) / 28)
  );

  ctx.fillStyle = 'rgba(57, 77, 101, 0.45)';
  ctx.font = '500 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  wrapText(ctx, url, 80, urlY, width - 160, 28, urlMaxLines);

  ctx.fillStyle = 'rgba(57, 77, 101, 0.35)';
  ctx.font = '500 22px system-ui, sans-serif';
  ctx.fillText(dict.shareImageWatermark, 80, watermarkY);

  return canvas.toDataURL('image/png');
}

/**
 * @param {string} dataUrl
 * @param {string} [filename]
 */
export function downloadShareImage(dataUrl, filename = 'echowing-share.png') {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * @param {string} dataUrl
 * @returns {Promise<File>}
 */
export async function imageDataUrlToFile(dataUrl, filename = 'echowing-share.png') {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'image/png' });
}
