import { FONT_ZH } from './pdfConstants';

/** PingFang TC（內嵌 Noto Sans TC）；Latin 亦用同一字型以確保混排與頁首頁尾可搜尋 */
const FONT_URL = '/fonts/NotoSansTC-Regular.ttf';
const FONT_VFS_NAME = 'NotoSansTC-Regular.ttf';

let fontLoadPromise = null;

export function ptToMm(pt) {
  return pt * 0.352778;
}

export function lineLeadingMm(fontSizePt, factor = 1.5) {
  return ptToMm(fontSizePt) * factor;
}

async function loadFontBase64() {
  if (!fontLoadPromise) {
    fontLoadPromise = fetch(FONT_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Font fetch failed: ${FONT_URL}`);
        return r.arrayBuffer();
      })
      .then((buf) => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      });
  }
  return fontLoadPromise;
}

/**
 * 註冊並啟用 PDF 主字型（對應 PingFang TC；專案授權內嵌 Noto Sans TC）。
 * San Francisco 無法在 Web 嵌入時，Latin 亦使用此字型以維持一致排版。
 */
export async function ensurePdfFonts(pdf) {
  const base64 = await loadFontBase64();
  if (!pdf.getFileFromVFS(FONT_VFS_NAME)) {
    pdf.addFileToVFS(FONT_VFS_NAME, base64);
    pdf.addFont(FONT_VFS_NAME, FONT_ZH, 'normal');
  }
  pdf.setFont(FONT_ZH, 'normal');
}

/** 所有文字（含頁首、頁尾、英文）皆用主字型，避免 Helvetica 顯示中文亂碼 */
export function applyPdfFont(pdf, fontSizePt) {
  pdf.setFont(FONT_ZH, 'normal');
  pdf.setFontSize(fontSizePt);
}

export function pickLocalized(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.zh ?? value.en ?? '';
}

/**
 * PDF 用半形冒號：jsPDF 內嵌 TTF 常無全形「：」(U+FF1A) 字形，會導致標籤與數值直接相連。
 */
export function fieldColon() {
  return ': ';
}

export function normalizeFieldLabel(label) {
  return String(label ?? '').replace(/[：:]\s*$/, '').trim();
}

export function normalizeFieldValue(value) {
  if (value == null) return '—';
  const s = typeof value === 'string' ? value.trim() : String(value);
  return s === '' ? '—' : s;
}

/** label + 冒號 + value（字串組合，供量測寬度） */
export function formatInlineField(label, value) {
  return `${normalizeFieldLabel(label)}${fieldColon()}${normalizeFieldValue(value)}`;
}
