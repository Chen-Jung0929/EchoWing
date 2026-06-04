import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatObservedAtForDisplay } from '../downloadMetadata';
import { PdfLayoutEngine } from './pdfLayoutEngine';
import {
  CONTENT_BOTTOM,
  CONTENT_WIDTH,
  FONT_ZH,
  PAGE,
  PDF_GENERATOR,
  WATERMARK_COVER_OPACITY,
} from './pdfConstants';
import { applyPdfFont, ensurePdfFonts, pickLocalized } from './pdfFonts';
import { renderSpectrogramForPdf } from './pdfSpectrogram';
import { resolveConfidenceThreshold } from '../../config/confidenceThreshold';
import { segmentNumberFromStart } from '../aggregateByVote';
import { validatePdfQuality } from './pdfQualityCheck';

const LOGO_SRC = '/logo.png';

function buildPdfFilename(sourceName) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const hhmmss = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const yyyymmdd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const base = (sourceName || 'unknown')
    .replace(/\.[^/.]+$/, '')
    .replace(/[<>:"/\\|?*\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'unknown';
  return `${base}_FullReport_${hhmmss}_${yyyymmdd}.pdf`;
}

async function loadLogoDataUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => reject(new Error(`Failed to load logo: ${src}`));
    img.src = src;
  });
}

function drawCoverWatermark(pdf, logo) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const maxW = pageW * 0.5;
  const maxH = pageH * 0.5;
  const ratio = logo.width / logo.height;
  let drawW = maxW;
  let drawH = drawW / ratio;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * ratio;
  }
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;
  if (typeof pdf.setGState === 'function' && typeof pdf.GState === 'function') {
    pdf.setGState(new pdf.GState({ opacity: WATERMARK_COVER_OPACITY }));
  }
  pdf.addImage(logo.dataUrl, 'PNG', x, y, drawW, drawH, undefined, 'FAST');
  if (typeof pdf.setGState === 'function' && typeof pdf.GState === 'function') {
    pdf.setGState(new pdf.GState({ opacity: 1 }));
  }
}

function hasOverviewNotes(overview) {
  if (!overview) return false;
  return Boolean(
    overview.observerName?.trim() ||
      overview.location?.trim() ||
      overview.environmentDescription?.trim() ||
      overview.overallConclusion?.trim() ||
      overview.observedAt?.trim()
  );
}

function hasSegmentNotes(seg) {
  if (!seg) return false;
  return Boolean(seg.fieldConfirmation?.trim() || seg.segmentNotes?.trim());
}

/**
 * @param {import('jspdf').jsPDF} pdf
 * @param {PdfLayoutEngine} layout
 * @param {{ head: string[][], body: string[][], startY?: number }} tableOpts
 * @returns {number} table height in mm (approx)
 */
function drawTable(pdf, layout, tableOpts) {
  const startY = tableOpts.startY ?? layout.y;
  applyPdfFont(pdf, 9);
  autoTable(pdf, {
    head: tableOpts.head,
    body: tableOpts.body,
    startY,
    margin: { left: PAGE.marginLeft, right: PAGE.marginRight, top: PAGE.marginTop },
    tableWidth: CONTENT_WIDTH,
    styles: {
      font: FONT_ZH,
      fontSize: 9,
      cellPadding: { top: 2.2, right: 2.5, bottom: 2.2, left: 2.5 },
      overflow: 'linebreak',
      valign: 'top',
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
      minCellHeight: 7,
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [31, 41, 55],
      fontStyle: 'normal',
      fontSize: 9,
    },
    bodyStyles: { textColor: [31, 41, 55], fontSize: 8.5 },
    theme: 'plain',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
  });
  const endY = pdf.lastAutoTable.finalY;
  layout.pageNumber = pdf.internal.getNumberOfPages();
  layout.y = endY + 3;
  if (layout.y > CONTENT_BOTTOM) {
    layout.addPage();
  }
  return endY - startY;
}

function estimateTableHeight(rowCount, hasHead = true) {
  const headRows = hasHead ? 1 : 0;
  return (headRows + rowCount) * 6.5 + 4;
}

function speciesTableBody(speciesRows, lang, isSummary, validChunkCount, windowSec = 5) {
  if (!speciesRows?.length) {
    const msg =
      lang === 'zh'
        ? '無達信心門檻的物種預測。'
        : 'No species met the confidence threshold.';
    return isSummary ? [[msg, '—', '—']] : [[msg, '—']];
  }
  return speciesRows.map((s) => {
    const name = pickLocalized(s.name, lang);
    const pct = `${Math.round((s.probability ?? 0) * 100)}%`;
    if (isSummary) {
      const segs = (s.chunk_indices ?? [])
        .map((startSec) => segmentNumberFromStart(startSec, windowSec))
        .join(lang === 'zh' ? '、' : ', ');
      const vote =
        s.vote_count != null
          ? ` (${s.vote_count}/${validChunkCount ?? '—'})`
          : '';
      return [name, `${pct}${vote}`, segs || '—'];
    }
    return [name, pct];
  });
}

function measureSegmentBlock(reportModel, seg, lang, fieldRecordMode) {
  let h = 14 + 22;
  const rows = seg.error ? 1 : (seg.predictions?.top_species?.length || 1);
  h += estimateTableHeight(rows);
  h += 52;
  const segMeta = reportModel.surveyMetadata?.segments?.[seg.index];
  if (fieldRecordMode) {
    h += hasSegmentNotes(segMeta) ? 18 : 28;
  } else if (hasSegmentNotes(segMeta)) {
    h += 14;
  }
  return h;
}

/**
 * @param {ReturnType<import('../buildFullReportModel').buildFullReportModel>} reportModel
 * @param {{ lang?: string }} [options]
 */
export async function buildBirdReportPdf(reportModel, options = {}) {
  const lang = options.lang ?? 'zh';
  const fieldRecordMode = Boolean(reportModel.surveyMetadata);
  const {
    sourceName,
    analysisId,
    generatedAt,
    summary,
    okChunkCount,
    totalChunkCount,
    durationSec,
    windowSec,
    confidenceThreshold,
    segmentRows,
    segmentReports,
    surveyMetadata,
  } = reportModel;

  const thresholdPct = Math.round(resolveConfidenceThreshold(confidenceThreshold) * 100);
  const reportTitle =
    lang === 'zh' ? '鳥類聲學辨識分析報告' : 'Bird Acoustic Analysis Report';
  const generatedLabel = new Date(generatedAt).toLocaleString(
    lang === 'zh' ? 'zh-TW' : 'en-US'
  );
  const sampleId = analysisId || sourceName;

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  pdf.setProperties({
    title: reportTitle,
    subject: sampleId,
    author: PDF_GENERATOR,
    creator: PDF_GENERATOR,
    keywords: `sample:${sourceName}`,
  });

  await ensurePdfFonts(pdf);

  const layout = new PdfLayoutEngine(pdf, {
    sampleId,
    reportTitle,
    lang,
  });

  const logo = await loadLogoDataUrl(LOGO_SRC).catch(() => null);

  // —— 封面／總覽（單一區塊，與原 HTML 報告結構一致） ——
  layout.markBookmark(lang === 'zh' ? '封面／總覽' : 'Cover / Overview');
  if (logo) drawCoverWatermark(pdf, logo);

  layout.drawTextBlock(reportTitle, {
    fontSize: 18,
    color: [22, 101, 52],
    lineHeight: 1.35,
    indent: false,
  });
  layout.drawTextBlock(lang === 'zh' ? '封面／總覽' : 'Cover / Overview', {
    fontSize: 12,
    color: [21, 128, 61],
    lineHeight: 1.35,
    indent: false,
  });
  layout.advance(2);
  layout.drawStackedFields(
    [
      { label: lang === 'zh' ? '報告編號' : 'Report ID', value: analysisId },
      { label: lang === 'zh' ? '產生時間' : 'Generated', value: generatedLabel },
    ],
    { fontSize: 9, indentMm: 0, rowGapMm: 2, color: [107, 114, 128] }
  );
  layout.advance(2);
  layout.drawSectionHeading(lang === 'zh' ? '樣本資訊' : 'Sample information');
  layout.drawFieldGrid(
    [
      { label: lang === 'zh' ? '原始檔名' : 'Source file', value: sourceName },
      {
        label: lang === 'zh' ? '有效片段' : 'Valid segments',
        value: `${okChunkCount} / ${totalChunkCount}`,
      },
      {
        label: lang === 'zh' ? '總時長' : 'Total duration',
        value: `~${durationSec} s`,
      },
      { label: lang === 'zh' ? '採樣率' : 'Sample rate', value: '32,000 Hz' },
      {
        label: lang === 'zh' ? '音訊通道' : 'Channels',
        value: lang === 'zh' ? '單聲道' : 'Mono',
      },
      {
        label: lang === 'zh' ? '信心門檻' : 'Threshold',
        value: `${thresholdPct}%`,
      },
    ],
    { fontSize: 9 }
  );

  layout.drawSectionHeading(lang === 'zh' ? '辨識結果彙整' : 'Aggregated results');
  layout.drawTextBlock(
    lang === 'zh'
      ? '以下為各片段 Top 預測的投票彙整。'
      : 'Vote aggregate across segment top predictions.',
    { fontSize: 8, color: [107, 114, 128], marginAfter: 5 }
  );

  const summarySpecies = summary?.predictions?.top_species ?? [];
  drawTable(pdf, layout, {
    head: [
      [
        lang === 'zh' ? '物種名稱' : 'Species',
        lang === 'zh' ? '出現百分比' : 'Appearance %',
        lang === 'zh' ? '出現片段' : 'Segments',
      ],
    ],
    body: speciesTableBody(summarySpecies, lang, true, okChunkCount, windowSec),
  });

  layout.drawSectionHeading(
    lang === 'zh' ? '片段信心一覽表' : 'Segment confidence overview',
    { compact: true }
  );
  const segConfBody = segmentRows.map((row) => {
    let status =
      lang === 'zh' ? '達門檻' : 'Above threshold';
    if (row.error) status = lang === 'zh' ? '失敗' : 'Failed';
    else if (row.lowConfidence) status = lang === 'zh' ? '低信心' : 'Low confidence';
    else if (!row.topSpeciesName) status = '—';
    const topLabel = row.error
      ? row.error
      : row.topSpeciesName
        ? pickLocalized(row.topSpeciesName, lang)
        : '—';
    const pct =
      row.topProbability != null
        ? `${Math.round(row.topProbability * 100)}%`
        : '—';
    return [
      String(row.segmentLabel),
      row.timeLabel,
      topLabel,
      pct,
      `${status} (${thresholdPct}%)`,
    ];
  });
  drawTable(pdf, layout, {
    head: [
      [
        lang === 'zh' ? '片段' : 'Seg.',
        lang === 'zh' ? '時間' : 'Time',
        lang === 'zh' ? 'Top 預測' : 'Top prediction',
        lang === 'zh' ? '信心' : 'Conf.',
        lang === 'zh' ? '狀態' : 'Status',
      ],
    ],
    body: segConfBody,
  });

  if (fieldRecordMode && surveyMetadata?.overview) {
    const o = surveyMetadata.overview;
    if (fieldRecordMode || hasOverviewNotes(o)) {
      layout.drawSectionHeading(
        lang === 'zh' ? '田野備註（總覽）' : 'Field notes (overview)'
      );
      const locationText = o.location?.trim()
        ? o.location.trim()
        : o.coordinates
          ? `${o.coordinates.latitude.toFixed(6)}, ${o.coordinates.longitude.toFixed(6)}`
          : '—';
      layout.drawFieldGrid(
        [
          {
            label: lang === 'zh' ? '觀察時間' : 'Observation time',
            value: formatObservedAtForDisplay(o.observedAt, lang),
          },
          {
            label: lang === 'zh' ? '觀察者' : 'Observer',
            value: o.observerName?.trim() || '—',
          },
          { label: lang === 'zh' ? '地點' : 'Location', value: locationText },
          {
            label: lang === 'zh' ? '環境描述' : 'Environment',
            value: o.environmentDescription?.trim() || '—',
          },
        ],
        { fontSize: 8.5 }
      );
      layout.drawStackedFields(
        [
          {
            label: lang === 'zh' ? '整體結論' : 'Overall conclusion',
            value: o.overallConclusion?.trim() || '—',
          },
        ],
        { fontSize: 8.5 }
      );
    }
  }

  // —— 各片段（每片段新頁） ——
  for (const seg of segmentReports) {
    layout.addPage();
    const blockH = measureSegmentBlock(reportModel, seg, lang, fieldRecordMode);
    const minWithTitle = 14 + 22 + estimateTableHeight(1) + 20;
    layout.keepTogether(Math.max(blockH, minWithTitle));

    layout.markBookmark(
      lang === 'zh' ? `片段 ${seg.segmentNum}` : `Segment ${seg.segmentNum}`
    );

    const segTitle = lang === 'zh' ? `片段 ${seg.segmentNum}` : `Segment ${seg.segmentNum}`;
    layout.drawSegmentTitle(segTitle, seg.timeLabel);

    layout.drawSectionHeading(lang === 'zh' ? '樣本資訊' : 'Sample information', {
      compact: true,
    });
    layout.drawFieldGrid(
      [
        {
          label: lang === 'zh' ? '片段編號' : 'Segment',
          value: String(seg.segmentNum),
        },
        {
          label: lang === 'zh' ? '時間範圍' : 'Time range',
          value: seg.timeLabel,
        },
        {
          label: lang === 'zh' ? '分析 ID' : 'Analysis ID',
          value: seg.analysisId || '—',
        },
        { label: lang === 'zh' ? '片段時長' : 'Duration', value: '5.0 s' },
      ],
      { fontSize: 8.5 }
    );

    layout.drawSectionHeading(lang === 'zh' ? '辨識結果' : 'Identification results');
    if (seg.error) {
      layout.drawTextBlock(seg.error, {
        fontSize: 9,
        color: [185, 28, 28],
        marginAfter: 2,
      });
    } else {
      drawTable(pdf, layout, {
        head: [
          [
            lang === 'zh' ? '物種名稱' : 'Species',
            lang === 'zh' ? '信心水準' : 'Confidence',
          ],
        ],
        body: speciesTableBody(
          seg.predictions?.top_species ?? [],
          lang,
          false,
          okChunkCount
        ),
      });
    }

    layout.drawSectionHeading(lang === 'zh' ? '片段頻譜圖' : 'Segment spectrogram');
    if (seg.spectrogram) {
      const specImg = renderSpectrogramForPdf(seg.spectrogram, {
        lang,
        segmentLabel: String(seg.segmentNum),
        timeRange: seg.timeLabel,
      });
      if (specImg) {
        const imgH = specImg.heightMm;
        layout.ensureSpace(imgH);
        pdf.addImage(
          specImg.dataUrl,
          'PNG',
          PAGE.marginLeft,
          layout.y,
          specImg.widthMm,
          imgH,
          undefined,
          'SLOW'
        );
        layout.y += imgH + 2;
      }
    } else {
      layout.drawTextBlock(
        lang === 'zh' ? '無可用頻譜資料' : 'No spectrogram',
        { fontSize: 9, color: [156, 163, 175], marginAfter: 2 }
      );
    }

    const segNotes = surveyMetadata?.segments?.[seg.index];
    if (fieldRecordMode) {
      layout.drawSectionHeading(
        lang === 'zh' ? '田野備註（片段）' : 'Field notes (segment)',
        { compact: !hasSegmentNotes(segNotes) }
      );
      const conf = segNotes?.fieldConfirmation?.trim() || '';
      const notes = segNotes?.segmentNotes?.trim() || '';
      layout.drawStackedFields(
        [
          {
            label: lang === 'zh' ? '確認結果' : 'Confirmation',
            value:
              fieldRecordMode && !conf && !notes ? '________________' : conf || '—',
          },
          {
            label: lang === 'zh' ? '片段專屬備註' : 'Segment notes',
            value:
              fieldRecordMode && !conf && !notes ? '________________' : notes || '—',
          },
        ],
        {
          fontSize: 8.5,
          rowGapMm: 6,
          color:
            fieldRecordMode && !conf && !notes
              ? [107, 114, 128]
              : [31, 41, 55],
        }
      );
    } else if (hasSegmentNotes(segNotes)) {
      layout.drawStackedFields(
        [
          {
            label: lang === 'zh' ? '確認結果' : 'Confirmation',
            value: segNotes.fieldConfirmation.trim(),
          },
          {
            label: lang === 'zh' ? '備註' : 'Notes',
            value: segNotes.segmentNotes.trim(),
          },
        ],
        { fontSize: 8, rowGapMm: 5 }
      );
    }
  }

  // —— 決策輔助 ——
  layout.addPage();
  layout.keepTogether(40);
  layout.markBookmark(lang === 'zh' ? '決策輔助' : 'Decision support');

  layout.drawSectionHeading(lang === 'zh' ? '決策輔助' : 'Decision support');
  const ds = summary?.decision_support;
  layout.drawStackedFields(
    [
      {
        label: lang === 'zh' ? '風險分析' : 'Risk analysis',
        value: pickLocalized(ds?.risk_analysis, lang),
      },
      {
        label: lang === 'zh' ? '行動建議' : 'Recommendation',
        value: pickLocalized(ds?.action_recommendation, lang),
      },
    ],
    { fontSize: 9, rowGapMm: 6, color: [30, 58, 138] }
  );
  layout.drawTextBlock(pickLocalized(ds?.disclaimer, lang), {
    fontSize: 7,
    color: [107, 114, 128],
    lineHeight: 1.4,
    marginAfter: 2,
  });

  layout.finalizePageDecorations();
  layout.applyBookmarks();

  const arrayBuffer = pdf.output('arraybuffer');
  const qa = await validatePdfQuality(arrayBuffer, {
    segmentCount: segmentReports.length,
    lang,
  });

  if (!qa.ok) {
    console.error('[PDF QA] Validation failed:', qa.errors);
    const err = new Error(qa.errors.join('; '));
    err.qa = qa;
    throw err;
  }
  if (qa.warnings.length) {
    console.warn('[PDF QA] Warnings:', qa.warnings);
  }

  return {
    pdf,
    filename: buildPdfFilename(sourceName),
    qa,
  };
}

export { buildPdfFilename };
