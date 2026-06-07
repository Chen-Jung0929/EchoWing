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
import { applyPdfFont, ensurePdfFonts, pickLocalized, formatPdfTimeRangeSec, sanitizePdfText } from './pdfFonts';
import { renderSpectrogramForPdf } from './pdfSpectrogram';
import { resolveConfidenceThreshold } from '../../config/confidenceThreshold';
import { getDict, formatMessage } from '../../i18n';
import { getModelDisplayLabel } from '../modelLabel';
import { validatePdfQuality } from './pdfQualityCheck';
import { formatPeakTimeRange } from '../timeline/mergeConsecutiveEvents';

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

/**
 * @param {import('jspdf').jsPDF} pdf
 * @param {PdfLayoutEngine} layout
 * @param {{ head: string[][], body: string[][], startY?: number }} tableOpts
 * @returns {number} table height in mm (approx)
 */
function drawTable(pdf, layout, tableOpts, autoTable) {
  const startY = tableOpts.startY ?? layout.y;
  const lang = layout.lang ?? 'zh';
  const body = (tableOpts.body ?? []).map((row) =>
    row.map((cell) => sanitizePdfText(String(cell ?? ''), lang))
  );
  applyPdfFont(pdf, 9);
  autoTable(pdf, {
    head: tableOpts.head,
    body,
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

function timelineSpeciesTableBody(speciesRows, lang, dict) {
  if (!speciesRows?.length) {
    return [
      [
        dict.pdfNoSpeciesEvents,
        '—',
        '—',
      ],
    ];
  }
  return speciesRows.map((s) => [
    pickLocalized(s.name, lang),
    `${Math.round((s.probability ?? 0) * 100)}%`,
    s.peak_time != null ? `${s.peak_time}s` : '—',
  ]);
}

function timelineEventTableBody(eventRows, lang, dict) {
  if (!eventRows?.length) {
    return [
      [
        dict.pdfNoEventsDetected,
        '—',
        '—',
        '—',
        '—',
      ],
    ];
  }
  return eventRows.map((row) => [
    pickLocalized(row.name, lang),
    `${row.onset}s`,
    `${row.offset}s`,
    sanitizePdfText(formatPeakTimeRange(row), lang),
    `${Math.round((row.confidence ?? 0) * 100)}%`,
  ]);
}

function speciesTimeSpanLabel(events, dict) {
  if (!events?.length) return '—';
  const starts = events.map((ev) => ev.onset ?? ev.peakTime ?? 0);
  const ends = events.map((ev) => ev.offset ?? ev.peakTime ?? 0);
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  if (min === max) return formatMessage(dict.pdfTimeSec, { sec: min });
  return formatPdfTimeRangeSec(min, max, dict);
}

function measureSpeciesBlock(speciesReport) {
  let h = 14 + 22 + 14;
  const rows = Math.max(speciesReport.events?.length ?? 0, 1);
  h += estimateTableHeight(rows);
  h += 52;
  return h;
}

/** @param {object} reportModel */
function resolveSpeciesReports(reportModel) {
  if (Array.isArray(reportModel.speciesReports)) {
    return reportModel.speciesReports;
  }
  const summary = reportModel.timelineSpeciesSummary;
  if (!Array.isArray(summary)) {
    return [];
  }
  const eventRows = Array.isArray(reportModel.timelineEventRows)
    ? reportModel.timelineEventRows
    : Array.isArray(reportModel.timeline?.species_events)
      ? reportModel.timeline.species_events
      : [];
  return summary.map((species, index) => ({
    rank: index + 1,
    species_id: species.species_id,
    name: species.name,
    scientific_name: species.scientific_name ?? '',
    probability: species.probability ?? 0,
    peak_time: species.peak_time,
    events: eventRows.filter((row) => row.species_id === species.species_id),
    eventSegments: [],
  }));
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
    decisionSupport,
    durationSec,
    confidenceThreshold,
    modelName = 'perch',
    surveyMetadata,
    stitchedSpectrogram,
    timelineEventRows,
    timelineSpeciesSummary,
    timelineEvents,
    xaiAvailable = false,
  } = reportModel;
  const speciesReports = resolveSpeciesReports(reportModel);

  const thresholdPct = Math.round(resolveConfidenceThreshold(confidenceThreshold) * 100);
  const dict = getDict(lang);
  const modelLabel = getModelDisplayLabel(modelName, dict);
  const reportTitle = dict.pdfReportTitle;
  const generatedLabel = new Date(generatedAt).toLocaleString(
    lang === 'zh' ? 'zh-TW' : 'en-US'
  );
  const sampleId = analysisId || sourceName;

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

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
  layout.markBookmark(dict.pdfCoverOverview);
  if (logo) drawCoverWatermark(pdf, logo);

  layout.drawTextBlock(reportTitle, {
    fontSize: 18,
    color: [22, 101, 52],
    lineHeight: 1.35,
    indent: false,
  });
  layout.drawTextBlock(dict.pdfCoverOverview, {
    fontSize: 12,
    color: [21, 128, 61],
    lineHeight: 1.35,
    indent: false,
  });
  layout.advance(2);
  layout.drawStackedFields(
    [
      { label: dict.pdfReportId, value: analysisId },
      { label: dict.pdfGeneratedAt, value: generatedLabel },
    ],
    { fontSize: 9, indentMm: 0, rowGapMm: 2, color: [107, 114, 128] }
  );
  layout.advance(2);
  layout.drawSectionHeading(dict.pdfSampleInfo);
  layout.drawFieldGrid(
    [
      { label: dict.sourceFile, value: sourceName },
      {
        label: dict.pdfTotalDuration,
        value: formatMessage(dict.pdfApproxSec, { sec: durationSec }),
      },
      { label: dict.pdfSampleRate, value: '32,000 Hz' },
      {
        label: dict.pdfChannels,
        value: dict.pdfChannelMono,
      },
      {
        label: dict.pdfThreshold,
        value: `${thresholdPct}%`,
      },
      {
        label: dict.modelUsed,
        value: modelLabel,
      },
      {
        label: dict.xaiStatusLabel,
        value: xaiAvailable ? dict.xaiStatusAvailable : dict.xaiStatusUnavailablePdf,
      },
    ],
    { fontSize: 9 }
  );

  layout.drawSectionHeading(dict.pdfSpeciesActivitySummary);
  layout.drawTextBlock(
    dict.pdfActivitySummaryHint,
    { fontSize: 8, color: [107, 114, 128], marginAfter: 5 }
  );

  drawTable(pdf, layout, {
    head: [
      [
        dict.pdfSpeciesName,
        dict.pdfPeakEventConfidence,
        dict.pdfPeakTimeSingle,
      ],
    ],
    body: timelineSpeciesTableBody(timelineSpeciesSummary, lang, dict),
  }, autoTable);

  layout.drawSectionHeading(dict.pdfSpeciesEvents, {
    compact: true,
  });
  drawTable(pdf, layout, {
    head: [
      [
        dict.pdfSpecies,
        dict.pdfOnset,
        dict.pdfOffset,
        dict.pdfPeakTimesPlural,
        dict.pdfEventConfidenceLabel,
      ],
    ],
    body: timelineEventTableBody(timelineEventRows, lang, dict),
  }, autoTable);

  if (stitchedSpectrogram) {
    layout.drawSectionHeading(dict.pdfFullSpectrogram, {
      compact: true,
    });
    const specImg = renderSpectrogramForPdf(stitchedSpectrogram, {
      lang,
      durationSec,
      events: timelineEvents,
      dict,
    });
    if (specImg) {
      layout.ensureSpace(specImg.heightMm);
      pdf.addImage(
        specImg.dataUrl,
        'PNG',
        PAGE.marginLeft,
        layout.y,
        specImg.widthMm,
        specImg.heightMm,
        undefined,
        'SLOW'
      );
      layout.y += specImg.heightMm + 2;
    }
  }

  if (fieldRecordMode && surveyMetadata?.overview) {
    const o = surveyMetadata.overview;
    if (fieldRecordMode || hasOverviewNotes(o)) {
      layout.drawSectionHeading(dict.pdfFieldNotesOverview);
      const locationText = o.location?.trim()
        ? o.location.trim()
        : o.coordinates
          ? `${o.coordinates.latitude.toFixed(6)}, ${o.coordinates.longitude.toFixed(6)}`
          : '—';
      layout.drawFieldGrid(
        [
          {
            label: dict.pdfObservationTime,
            value: formatObservedAtForDisplay(o.observedAt, lang),
          },
          {
            label: dict.pdfObserver,
            value: o.observerName?.trim() || '—',
          },
          { label: dict.pdfLocation, value: locationText },
          {
            label: dict.pdfEnvironment,
            value: o.environmentDescription?.trim() || '—',
          },
        ],
        { fontSize: 8.5 }
      );
      layout.drawStackedFields(
        [
          {
            label: dict.pdfOverallConclusion,
            value: o.overallConclusion?.trim() || '—',
          },
        ],
        { fontSize: 8.5 }
      );
    }
  }

  // —— 主要預測物種（各物種一節：時間軸事件 + 全段頻譜標籤） ——
  for (const sp of speciesReports) {
    layout.addPage();
    const blockH = measureSpeciesBlock(sp);
    const minWithTitle = 14 + 22 + estimateTableHeight(1) + 20;
    layout.keepTogether(Math.max(blockH, minWithTitle));

    const speciesName = pickLocalized(sp.name, lang);
    layout.markBookmark(
      formatMessage(dict.pdfSpeciesRankBookmark, { rank: sp.rank, species: speciesName })
    );

    const spTitle = formatMessage(dict.pdfPrimarySpeciesTitle, { rank: sp.rank, species: speciesName });
    layout.drawSegmentTitle(spTitle, speciesTimeSpanLabel(sp.events, dict));

    layout.drawSectionHeading(dict.pdfSpeciesInfo, {
      compact: true,
    });
    layout.drawFieldGrid(
      [
        {
          label: dict.pdfScientificName,
          value: sp.scientific_name?.trim() || '—',
        },
        {
          label: dict.pdfPeakEventConfidence,
          value: `${Math.round((sp.probability ?? 0) * 100)}%`,
        },
        {
          label: dict.pdfPeakTimeSingle,
          value: sp.peak_time != null ? `${sp.peak_time}s` : '—',
        },
        {
          label: dict.pdfActivitySpan,
          value: speciesTimeSpanLabel(sp.events, dict),
        },
      ],
      { fontSize: 8.5 }
    );

    layout.drawSectionHeading(
      dict.pdfTimelineEvents,
      { compact: true }
    );
    drawTable(pdf, layout, {
      head: [
        [
          dict.pdfOnset,
          dict.pdfOffset,
          dict.pdfPeakTimesPlural,
          dict.pdfEventConfidenceLabel,
        ],
      ],
      body: timelineEventTableBody(sp.events, lang, dict).map((row) => row.slice(1)),
    }, autoTable);

    layout.drawSectionHeading(
      dict.pdfFullSpecSpeciesLabels,
      { compact: true }
    );
    if (stitchedSpectrogram) {
      const specImg = renderSpectrogramForPdf(stitchedSpectrogram, {
        lang,
        title: formatMessage(dict.pdfSpecSpeciesTitle, { species: speciesName }),
        durationSec,
        events: sp.events,
        timeOffsetSec: 0,
        dict,
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
        dict.pdfNoSpectrogramData,
        { fontSize: 9, color: [156, 163, 175], marginAfter: 2 }
      );
    }
  }

  // —— 決策輔助 ——
  layout.addPage();
  layout.keepTogether(40);
  layout.markBookmark(dict.pdfDecisionSupport);

  layout.drawSectionHeading(dict.pdfDecisionSupport);
  layout.drawTextBlock(
    dict.pdfDecisionSupportHint,
    { fontSize: 8, color: [107, 114, 128], marginAfter: 5 }
  );
  const ds = decisionSupport;
  layout.drawStackedFields(
    [
      {
        label: dict.pdfRiskAnalysis,
        value: pickLocalized(ds?.risk_analysis, lang),
      },
      {
        label: dict.pdfRecommendation,
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
    speciesCount: speciesReports.length,
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
