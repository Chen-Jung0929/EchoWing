import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  CONTENT_BOTTOM,
  PAGE,
} from './pdfConstants';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const BLANK_PAGE_THRESHOLD = 0.012;
const MAX_EXPECTED_PAGES_FACTOR = 1.35;

/**
 * @typedef {{
 *   ok: boolean,
 *   errors: string[],
 *   warnings: string[],
 *   pageCount: number,
 *   textCharCount: number,
 * }} PdfQaResult
 */

/**
 * @param {ArrayBuffer} pdfBuffer
 * @param {{ segmentCount: number, lang: string }} context
 * @returns {Promise<PdfQaResult>}
 */
export async function validatePdfQuality(pdfBuffer, context) {
  const errors = [];
  const warnings = [];
  const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;

  let textCharCount = 0;
  const pageTextLengths = [];

  for (let p = 1; p <= pageCount; p += 1) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((it) => it.str).join('');
    textCharCount += pageText.length;
    pageTextLengths.push(pageText.trim().length);

    const viewport = page.getViewport({ scale: 0.35 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let nonWhite = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r < 250 || g < 250 || b < 250) nonWhite += 1;
    }
    const inkRatio = nonWhite / (canvas.width * canvas.height);
    if (p > 1 && p < pageCount && inkRatio < BLANK_PAGE_THRESHOLD) {
      errors.push(
        context.lang === 'zh'
          ? `第 ${p} 頁內容過少（疑似空白頁）`
          : `Page ${p} has too little content (near-blank)`
      );
    }

    const bottomBandY = Math.floor(canvas.height * 0.88);
    let bottomInk = 0;
    let bottomSamples = 0;
    for (let y = bottomBandY; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const idx = (y * canvas.width + x) * 4;
        if (data[idx] < 240 || data[idx + 1] < 240 || data[idx + 2] < 240) {
          bottomInk += 1;
        }
        bottomSamples += 1;
      }
    }
    if (p < pageCount && bottomInk / bottomSamples > 0.08 && pageTextLengths[p - 1] < 40) {
      warnings.push(
        context.lang === 'zh'
          ? `第 ${p} 頁底部可能有 orphan heading`
          : `Possible orphan heading at bottom of page ${p}`
      );
    }
  }

  if (textCharCount < 50) {
    errors.push(
      context.lang === 'zh'
        ? 'PDF 無法抽取足夠文字（不可搜尋）'
        : 'Insufficient extractable text (not searchable)'
    );
  }

  const expectedMax = 1 + context.segmentCount + 1;
  if (pageCount > expectedMax * MAX_EXPECTED_PAGES_FACTOR) {
    errors.push(
      context.lang === 'zh'
        ? `頁數異常：${pageCount} 頁（預期約 ≤ ${Math.ceil(expectedMax * MAX_EXPECTED_PAGES_FACTOR)}）`
        : `Abnormal page count: ${pageCount} (expected ≈ ≤ ${Math.ceil(expectedMax * MAX_EXPECTED_PAGES_FACTOR)})`
    );
  }

  const safeBottomPt = (CONTENT_BOTTOM / 25.4) * 72;
  const pageHeightPt = (PAGE.height / 25.4) * 72;
  if (safeBottomPt >= pageHeightPt - 4) {
    warnings.push('Safe area bottom margin may be misconfigured');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    pageCount,
    textCharCount,
  };
}
