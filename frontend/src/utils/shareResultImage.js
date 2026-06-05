import { drawSpectrogramPayload } from './spectrogramCache';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 * @param {number} lineHeight
 * @returns {number}
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const paragraphs = String(text).split('\n');
  let cursorY = y;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let line = '';

    for (let i = 0; i < words.length; i += 1) {
      const testLine = line ? `${line} ${words[i]}` : words[i];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY);
        line = words[i];
        cursorY += lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
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
 */
function drawSpectrogramInset(ctx, spectrogram, x, y, w, h, opacity = 0.42) {
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
 * @param {Array<{ name: string, pct: number }>} opts.speciesItems
 * @param {string} opts.url
 * @param {import('../i18n').LocaleMessages} opts.dict
 * @param {import('./spectrogramCache').SpectrogramPayload | null} [opts.spectrogram]
 */
export function renderShareImageCard({
  title,
  tabLabel,
  filename,
  speciesItems,
  url,
  dict,
  spectrogram = null,
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
  wrapText(ctx, sourceLine, 80, 230, width - 160, 36);

  const panelX = 72;
  const panelY = 300;
  const panelW = width - 144;
  const panelH = 520;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(57, 77, 101, 0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.fill();
  ctx.stroke();

  if (spectrogram) {
    ctx.save();
    roundRect(ctx, panelX, panelY, panelW, panelH, 28);
    ctx.clip();
    drawSpectrogramInset(ctx, spectrogram, panelX + 12, panelY + panelH - 168, panelW - 24, 156, 0.28);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.fillRect(panelX + 12, panelY + 12, panelW - 24, panelH - 188);
    ctx.restore();

    ctx.fillStyle = 'rgba(57, 77, 101, 0.55)';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText(dict.spectrogramTitle, 112, panelY + panelH - 182);
  }

  ctx.fillStyle = '#394d65';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(dict.topSpecies, 112, 370);

  const items = speciesItems?.length
    ? speciesItems.slice(0, 5)
    : [{ name: dict.noSpeciesHint, pct: 0 }];

  let itemY = 430;
  for (const item of items) {
    ctx.font = '600 40px system-ui, sans-serif';
    ctx.fillStyle = '#394d65';
    const name = item.name.length > 18 ? `${item.name.slice(0, 18)}…` : item.name;
    ctx.fillText(name, 112, itemY);

    if (item.pct > 0) {
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.fillStyle = '#7e98a7';
      ctx.fillText(`${item.pct}%`, width - 180, itemY);

      ctx.fillStyle = 'rgba(126, 152, 167, 0.2)';
      roundRect(ctx, 112, itemY + 18, width - 224, 14, 7);
      ctx.fill();
      ctx.fillStyle = '#7e98a7';
      roundRect(ctx, 112, itemY + 18, ((width - 224) * item.pct) / 100, 14, 7);
      ctx.fill();
    }

    itemY += 88;
  }

  ctx.fillStyle = 'rgba(57, 77, 101, 0.45)';
  ctx.font = '500 24px system-ui, sans-serif';
  wrapText(ctx, url, 80, 900, width - 160, 32);

  ctx.fillStyle = 'rgba(57, 77, 101, 0.35)';
  ctx.font = '500 22px system-ui, sans-serif';
  ctx.fillText(dict.shareImageWatermark, 80, height - 56);

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
