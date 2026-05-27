import {
  CONTENT_BOTTOM,
  CONTENT_WIDTH,
  FIELD_GRID,
  PAGE,
  SECTION_INDENT_MM,
  STACKED_FIELD,
} from './pdfConstants';
import {
  applyPdfFont,
  fieldColon,
  normalizeFieldLabel,
  normalizeFieldValue,
  lineLeadingMm,
} from './pdfFonts';

/**
 * Block-based PDF layout：先量高度、再繪製；超出 safe area 則換頁。
 */
export class PdfLayoutEngine {
  /**
   * @param {import('jspdf').jsPDF} pdf
   * @param {{ sampleId: string, reportTitle: string, lang: string }} headerMeta
   */
  constructor(pdf, headerMeta) {
    this.pdf = pdf;
    this.sampleId = headerMeta.sampleId;
    this.reportTitle = headerMeta.reportTitle;
    this.lang = headerMeta.lang;
    this.y = PAGE.marginTop;
    this.pageNumber = 1;
    /** @type {{ title: string, page: number }[]} */
    this.bookmarks = [];
    this._pageFooters = [];
  }

  get contentWidth() {
    return CONTENT_WIDTH;
  }

  get remaining() {
    return CONTENT_BOTTOM - this.y;
  }

  contentX(indentMm = SECTION_INDENT_MM) {
    return PAGE.marginLeft + indentMm;
  }

  contentWidthFor(indentMm = SECTION_INDENT_MM) {
    return this.contentWidth - indentMm;
  }

  markBookmark(title) {
    this.bookmarks.push({ title, page: this.pageNumber });
  }

  ensureSpace(requiredMm) {
    if (this.y + requiredMm > CONTENT_BOTTOM) {
      this.addPage();
      return true;
    }
    return false;
  }

  keepTogether(totalHeightMm) {
    if (totalHeightMm > CONTENT_BOTTOM - PAGE.marginTop) {
      return;
    }
    if (this.y + totalHeightMm > CONTENT_BOTTOM) {
      this.addPage();
    }
  }

  addPage() {
    this._pageFooters.push({
      page: this.pageNumber,
      yEnd: this.y,
    });
    this.pdf.addPage();
    this.pageNumber += 1;
    this.y = PAGE.marginTop;
    applyPdfFont(this.pdf, 10);
  }

  advance(mm) {
    this.y += mm;
  }

  /**
   * 分開繪製「標籤: 」與值，避免冒號在 splitTextToSize 或字型中遺失。
   * @returns {number} 此欄位佔用高度 (mm)
   */
  drawInlineFieldAt(x, baselineY, maxWidth, label, value, fontSize) {
    applyPdfFont(this.pdf, fontSize);
    const prefix = `${normalizeFieldLabel(label)}${fieldColon()}`;
    const valueText = normalizeFieldValue(value);
    const prefixW = this.pdf.getTextWidth(prefix);
    const valueLines = this.pdf.splitTextToSize(valueText, Math.max(8, maxWidth - prefixW));
    const leading = lineLeadingMm(fontSize, 1.45);

    if (valueLines.length <= 1 && this.pdf.getTextWidth(valueText) <= maxWidth - prefixW) {
      this.pdf.text(prefix, x, baselineY);
      this.pdf.text(valueText, x + prefixW, baselineY);
      return leading;
    }

    this.pdf.text(prefix, x, baselineY);
    let linesUsed = 1;
    if (valueLines[0]) {
      this.pdf.text(valueLines[0], x + prefixW, baselineY);
    }
    for (let i = 1; i < valueLines.length; i += 1) {
      const lineY = baselineY + leading * i;
      this.pdf.text(valueLines[i], x, lineY);
      linesUsed = i + 1;
    }
    return linesUsed * leading;
  }

  /**
   * @param {string} text
   * @param {{ fontSize?: number, color?: [number, number, number], lineHeight?: number, maxLines?: number, indentMm?: number, marginAfter?: number, indent?: boolean }} opts
   */
  measureTextBlock(text, opts = {}) {
    const fontSize = opts.fontSize ?? 10;
    const lineHeight = opts.lineHeight ?? 1.5;
    const indentMm = opts.indent === false ? 0 : (opts.indentMm ?? SECTION_INDENT_MM);
    applyPdfFont(this.pdf, fontSize);
    const lines = this.pdf.splitTextToSize(text || '', this.contentWidthFor(indentMm));
    const capped = opts.maxLines ? lines.slice(0, opts.maxLines) : lines;
    const marginAfter = opts.marginAfter ?? 1;
    return capped.length * lineLeadingMm(fontSize, lineHeight) + marginAfter;
  }

  drawTextBlock(text, opts = {}) {
    const fontSize = opts.fontSize ?? 10;
    const lineHeight = opts.lineHeight ?? 1.5;
    const color = opts.color ?? [31, 41, 55];
    const indentMm = opts.indent === false ? 0 : (opts.indentMm ?? SECTION_INDENT_MM);
    const marginAfter = opts.marginAfter ?? 1;
    const x = this.contentX(indentMm);
    const leading = lineLeadingMm(fontSize, lineHeight);
    applyPdfFont(this.pdf, fontSize);
    const lines = this.pdf.splitTextToSize(text || '', this.contentWidthFor(indentMm));
    const capped = opts.maxLines ? lines.slice(0, opts.maxLines) : lines;
    const blockH = capped.length * leading + marginAfter;
    this.ensureSpace(blockH);
    this.pdf.setTextColor(...color);
    for (const line of capped) {
      this.y += leading;
      this.pdf.text(line, x, this.y);
    }
    this.y += marginAfter;
    return blockH;
  }

  /**
   * 雙欄 inline 欄位（相對 SectionHeading 縮排）
   * @param {Array<{ label: string, value: string }>} fields
   * @param {{ fontSize?: number, columns?: number, indentMm?: number }} [opts]
   */
  drawFieldGrid(fields, opts = {}) {
    const fontSize = opts.fontSize ?? 9;
    const columns = opts.columns ?? FIELD_GRID.columns;
    const indentMm = opts.indentMm ?? SECTION_INDENT_MM;
    const colGap = FIELD_GRID.columnGapMm;
    const rowGap = FIELD_GRID.rowGapMm;
    const usableWidth = this.contentWidthFor(indentMm);
    const colWidth = (usableWidth - colGap * (columns - 1)) / columns;
    const leading = lineLeadingMm(fontSize, 1.45);
    const baseX = this.contentX(indentMm);

    for (let i = 0; i < fields.length; i += columns) {
      const rowFields = fields.slice(i, i + columns);
      let rowHeight = leading;

      rowFields.forEach((field) => {
        applyPdfFont(this.pdf, fontSize);
        const prefix = `${normalizeFieldLabel(field.label)}${fieldColon()}`;
        const valueText = normalizeFieldValue(field.value);
        const prefixW = this.pdf.getTextWidth(prefix);
        const valueLines = this.pdf.splitTextToSize(
          valueText,
          Math.max(8, colWidth - prefixW)
        );
        const cellH = Math.max(1, valueLines.length) * leading;
        rowHeight = Math.max(rowHeight, cellH);
      });

      this.ensureSpace(rowHeight + rowGap);
      const rowTop = this.y;
      rowFields.forEach((field, colIdx) => {
        const x = baseX + colIdx * (colWidth + colGap);
        this.pdf.setTextColor(31, 41, 55);
        this.drawInlineFieldAt(
          x,
          rowTop + leading,
          colWidth,
          field.label,
          field.value,
          fontSize
        );
      });
      this.y = rowTop + rowHeight + rowGap;
    }
    this.y += 1;
  }

  /**
   * 單欄直向 inline 欄位（田野備註等，列與列間距較大）
   * @param {Array<{ label: string, value: string }>} fields
   * @param {{ fontSize?: number, indentMm?: number, rowGapMm?: number }} [opts]
   */
  drawStackedFields(fields, opts = {}) {
    const fontSize = opts.fontSize ?? 8.5;
    const indentMm = opts.indentMm ?? SECTION_INDENT_MM;
    const rowGap = opts.rowGapMm ?? STACKED_FIELD.rowGapMm;
    const color = opts.color ?? [31, 41, 55];
    const x = this.contentX(indentMm);
    const width = this.contentWidthFor(indentMm);
    const leading = lineLeadingMm(fontSize, 1.45);

    for (const field of fields) {
      applyPdfFont(this.pdf, fontSize);
      const prefix = `${normalizeFieldLabel(field.label)}${fieldColon()}`;
      const valueText = normalizeFieldValue(field.value);
      const prefixW = this.pdf.getTextWidth(prefix);
      const valueLines = this.pdf.splitTextToSize(
        valueText,
        Math.max(8, width - prefixW)
      );
      const blockH = Math.max(1, valueLines.length) * leading + rowGap;
      this.ensureSpace(blockH);
      const blockTop = this.y;
      this.pdf.setTextColor(...color);
      const usedH = this.drawInlineFieldAt(
        x,
        blockTop + leading,
        width,
        field.label,
        field.value,
        fontSize
      );
      this.y = blockTop + Math.max(usedH, leading) + rowGap;
    }
    this.y += 0.5;
  }

  drawSectionHeading(title, opts = {}) {
    const fontSize = opts.compact ? 10 : 11;
    const padY = 1.8;
    const leading = lineLeadingMm(fontSize, 1.3);
    const boxH = leading + padY * 2;
    const gapAfter = opts.gapAfter ?? 2;
    this.ensureSpace(boxH + gapAfter);
    const boxTop = this.y;
    this.pdf.setFillColor(243, 244, 246);
    this.pdf.rect(PAGE.marginLeft, boxTop, this.contentWidth, boxH, 'F');
    applyPdfFont(this.pdf, fontSize);
    this.pdf.setTextColor(55, 65, 81);
    this.pdf.text(title, PAGE.marginLeft + 2, boxTop + padY + leading * 0.82);
    this.y = boxTop + boxH + gapAfter;
    return boxH;
  }

  drawSegmentTitle(title, subtitle) {
    const titleSize = 14;
    const subSize = 9;
    const titleLead = lineLeadingMm(titleSize, 1.25);
    const subLead = lineLeadingMm(subSize, 1.35);
    const total = titleLead + (subtitle ? subLead : 0) + 4;
    this.ensureSpace(total);

    applyPdfFont(this.pdf, titleSize);
    this.pdf.setTextColor(22, 101, 52);
    this.y += titleLead;
    this.pdf.text(title, PAGE.marginLeft, this.y);

    if (subtitle) {
      applyPdfFont(this.pdf, subSize);
      this.pdf.setTextColor(107, 114, 128);
      this.y += subLead;
      this.pdf.text(subtitle, PAGE.marginLeft, this.y);
    }

    this.y += 2;
    this.pdf.setDrawColor(22, 163, 74);
    this.pdf.setLineWidth(0.4);
    this.pdf.line(PAGE.marginLeft, this.y, PAGE.marginLeft + this.contentWidth, this.y);
    this.y += 3;
    return total;
  }

  finalizePageDecorations() {
    this._pageFooters.push({ page: this.pageNumber, yEnd: this.y });
    const total = this.pdf.internal.getNumberOfPages();
    const headerSize = 7.5;
    const footerSize = 8;

    for (let i = 1; i <= total; i += 1) {
      this.pdf.setPage(i);
      applyPdfFont(this.pdf, headerSize);
      this.pdf.setTextColor(107, 114, 128);

      this.pdf.text(this.sampleId, PAGE.marginLeft, PAGE.headerY);

      const titleLines = this.pdf.splitTextToSize(
        this.reportTitle,
        this.contentWidth * 0.55
      );
      const titleLine = titleLines[0] ?? this.reportTitle;
      const rightW = this.pdf.getTextWidth(titleLine);
      applyPdfFont(this.pdf, headerSize);
      this.pdf.text(
        titleLine,
        PAGE.width - PAGE.marginRight - rightW,
        PAGE.headerY
      );

      const footer =
        this.lang === 'zh'
          ? `第 ${i} / ${total} 頁`
          : `Page ${i} / ${total}`;
      applyPdfFont(this.pdf, footerSize);
      const fw = this.pdf.getTextWidth(footer);
      this.pdf.text(footer, (PAGE.width - fw) / 2, PAGE.footerY);
    }
  }

  applyBookmarks() {
    if (typeof this.pdf.outline?.add !== 'function') return;
    for (const bm of this.bookmarks) {
      this.pdf.outline.add(null, bm.title, { pageNumber: bm.page });
    }
  }
}
