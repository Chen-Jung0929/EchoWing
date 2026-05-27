/** A4 portrait layout (mm) */
export const PAGE = {
  width: 210,
  height: 297,
  /** 預留頁首帶（sampleId + 報告名稱） */
  marginTop: 24,
  marginBottom: 18,
  marginLeft: 14,
  marginRight: 14,
  headerY: 10,
  footerY: 289,
};

export const CONTENT_WIDTH =
  PAGE.width - PAGE.marginLeft - PAGE.marginRight;

export const CONTENT_BOTTOM = PAGE.height - PAGE.marginBottom;

/** jsPDF 內部字型名稱（對應 Noto Sans TC 檔，語意上為 PingFang TC） */
export const FONT_ZH = 'PingFangTC';

export const PDF_GENERATOR = 'BirdCLEF Report Generator';

export const SPECTROGRAM_DISPLAY = {
  widthMm: CONTENT_WIDTH,
  heightMm: 48,
  pixelScale: 3,
};

export const WATERMARK_COVER_OPACITY = 0.06;

/** 相對於 SectionHeading 的內文縮排 */
export const SECTION_INDENT_MM = 4;

export const FIELD_GRID = {
  columns: 2,
  columnGapMm: 6,
  rowGapMm: 4,
};

/** 單欄直向排列的 inline 欄位（如田野備註） */
export const STACKED_FIELD = {
  rowGapMm: 5,
};
