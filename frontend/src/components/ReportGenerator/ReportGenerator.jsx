import { forwardRef, useImperativeHandle, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import SpectrogramView from '../Visualizer/SpectrogramView';
import { sanitizeCloneForHtml2Canvas } from '../../utils/spectrogramCache';

function pickLocalized(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.zh ?? value.en ?? '';
}

const KIWI_WATERMARK_SRC = '/logo.png';

function buildPdfFilename(sourceName, pageSlug) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const hhmmss = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const yyyymmdd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const base = (sourceName || 'unknown')
    .replace(/\.[^/.]+$/, '')
    .replace(/[<>:"/\\|?*\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'unknown';
  return `${base}_${pageSlug}_${hhmmss}_${yyyymmdd}.pdf`;
}

function PdfPageWatermark() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={KIWI_WATERMARK_SRC}
        alt=""
        style={{
          width: '92%',
          maxWidth: '520px',
          opacity: 0.12,
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

const reportStyles = {
  root: {
    width: '168mm',
    maxWidth: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    fontFamily: 'Arial, sans-serif',
    wordBreak: 'break-word',
  },
  page: {
    position: 'relative',
    boxSizing: 'border-box',
    padding: '1.25rem 1.75rem',
    overflow: 'hidden',
  },
  contentLayer: {
    position: 'relative',
    zIndex: 1,
  },
  h1: { fontSize: '1.625rem', fontWeight: 700, color: '#166534', margin: 0, lineHeight: 1.3 },
  segmentBadge: {
    display: 'inline-block',
    marginTop: '0.35rem',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#15803d',
  },
  h2: {
    fontSize: '1.25rem',
    fontWeight: 700,
    backgroundColor: '#f3f4f6',
    padding: '0.5rem',
    marginBottom: '0.75rem',
  },
  header: {
    borderBottom: '2px solid #16a34a',
    paddingBottom: '1rem',
    marginBottom: '1.25rem',
  },
  meta: { fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' },
  section: { marginBottom: '1.25rem' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    tableLayout: 'fixed',
  },
  th: {
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid #d1d5db',
    verticalAlign: 'bottom',
    fontSize: '0.8125rem',
  },
  thSpecies: { width: '48%' },
  thMetric: {
    width: '18%',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    paddingRight: '0.25rem',
  },
  thSegments: { width: '34%' },
  td: {
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.875rem',
    verticalAlign: 'top',
  },
  tdMetric: {
    textAlign: 'right',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
    paddingRight: '0.25rem',
  },
  tdSegments: {
    fontSize: '0.8125rem',
    color: '#4b5563',
    lineHeight: 1.4,
  },
  box: {
    padding: '1.25rem',
    border: '2px solid #bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: '0.5rem',
  },
  footer: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e5e7eb',
    fontSize: '0.75rem',
    color: '#6b7280',
    fontStyle: 'italic',
  },
};

const ReportGenerator = forwardRef(function ReportGenerator(
  {
    data,
    audioInfo,
    spectrogram,
    spectrogramVariant = 'chunk',
    spectrogramSegmentCount,
    isSummaryReport = false,
    reportSegmentTitle,
    pdfPageSlug = 'report',
    lang = 'zh',
    hidden = true,
  },
  ref
) {
  const reportRef = useRef(null);

  useImperativeHandle(ref, () => ({
    downloadPdf: async () => {
      if (!reportRef.current || !data) {
        throw new Error('Report data is not ready');
      }

      const sourceName = audioInfo?.name || 'unknown.wav';
      const filename = buildPdfFilename(sourceName, pdfPageSlug);

      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = KIWI_WATERMARK_SRC;
      });

      const opt = {
        margin: [14, 14, 14, 14],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            const root = clonedDoc.querySelector('[data-pdf-report-root]');
            if (root) sanitizeCloneForHtml2Canvas(clonedDoc, root);
          },
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: {
          mode: ['css', 'legacy'],
          after: '.pdf-report-page-1',
          avoid: ['.pdf-report-page-1', '.pdf-report-page-2'],
        },
      };

      await new Promise((resolve) => setTimeout(resolve, 400));
      await html2pdf().set(opt).from(reportRef.current).save();
    },
  }));

  if (!data) return null;

  const speciesRows = data.predictions?.top_species ?? [];
  const segmentLabel = pickLocalized(reportSegmentTitle, lang);
  const reportTitle =
    lang === 'zh' ? '鳥類聲學辨識分析報告' : 'Bird Acoustic Analysis Report';

  const labels = isSummaryReport
    ? {
        metric: lang === 'zh' ? '出現百分比' : 'Appearance %',
        segments: lang === 'zh' ? '出現片段' : 'Segments',
      }
    : {
        metric: lang === 'zh' ? '信心水準' : 'Confidence',
        segments: null,
      };

  const formatSummarySegments = (indices) => {
    if (!indices?.length) return '—';
    return indices.map((i) => i + 1).join(lang === 'zh' ? '、' : ', ');
  };

  const content = (
    <div ref={reportRef} data-pdf-report-root style={reportStyles.root}>
      {/* 第一頁：樣本、辨識、頻譜 */}
      <div
        className="pdf-report-page-1"
        style={reportStyles.page}
      >
        <PdfPageWatermark />
        <div style={reportStyles.contentLayer}>
          <header style={reportStyles.header}>
            <h1 style={reportStyles.h1}>{reportTitle}</h1>
            <p style={reportStyles.segmentBadge}>{segmentLabel}</p>
            <p style={reportStyles.meta}>
              {lang === 'zh' ? '報告編號' : 'Report ID'}：{data.analysis_id} |{' '}
              {new Date().toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US')}
            </p>
          </header>

          <section style={reportStyles.section}>
            <h2 style={reportStyles.h2}>
              {lang === 'zh' ? '1. 樣本資訊' : '1. Sample Information'}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                fontSize: '0.875rem',
              }}
            >
              <p>
                <strong>{lang === 'zh' ? '原始檔名' : 'Source file'}：</strong>{' '}
                {audioInfo?.name || '—'}
              </p>
              <p>
                <strong>{lang === 'zh' ? '報告範圍' : 'Report scope'}：</strong>{' '}
                {segmentLabel}
              </p>
              <p>
                <strong>{lang === 'zh' ? '音訊時長' : 'Duration'}：</strong>{' '}
                {audioInfo?.duration ?? '5.0'} s
              </p>
              <p>
                <strong>{lang === 'zh' ? '採樣率' : 'Sample rate'}：</strong> 32,000 Hz
              </p>
              <p>
                <strong>{lang === 'zh' ? '音訊通道' : 'Channels'}：</strong>{' '}
                {lang === 'zh' ? '單聲道 (Mono)' : 'Mono'}
              </p>
              {isSummaryReport && audioInfo?.validChunkCount != null ? (
                <p>
                  <strong>{lang === 'zh' ? '有效片段' : 'Valid segments'}：</strong>{' '}
                  {audioInfo.validChunkCount}
                </p>
              ) : null}
            </div>
          </section>

          <section style={reportStyles.section}>
            <h2 style={reportStyles.h2}>
              {lang === 'zh' ? '2. 辨識結果' : '2. Identification Results'}
            </h2>
            {isSummaryReport ? (
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                {lang === 'zh'
                  ? '以下為各片段 Top 預測的投票彙整（出現百分比 = 得票片段數 / 有效片段數）。'
                  : 'Vote aggregate across segment top predictions (appearance % = votes / valid segments).'}
              </p>
            ) : null}
            {speciesRows.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {lang === 'zh'
                  ? '無達信心門檻的物種辨識結果。'
                  : 'No species met the confidence threshold.'}
              </p>
            ) : (
              <table style={reportStyles.table}>
                <thead>
                  <tr>
                    <th
                      style={{
                        ...reportStyles.th,
                        ...reportStyles.thSpecies,
                        ...(isSummaryReport ? {} : { width: '72%' }),
                      }}
                    >
                      {lang === 'zh' ? '物種名稱' : 'Species'}
                    </th>
                    <th
                      style={{
                        ...reportStyles.th,
                        ...reportStyles.thMetric,
                        ...(isSummaryReport ? {} : { width: '28%' }),
                      }}
                    >
                      {labels.metric}
                    </th>
                    {isSummaryReport ? (
                      <th style={{ ...reportStyles.th, ...reportStyles.thSegments }}>
                        {labels.segments}
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {speciesRows.map((s) => (
                    <tr key={s.species_id}>
                      <td style={reportStyles.td}>{pickLocalized(s.name, lang)}</td>
                      <td style={{ ...reportStyles.td, ...reportStyles.tdMetric }}>
                        {Math.round((s.probability ?? 0) * 100)}%
                        {isSummaryReport && s.vote_count != null ? (
                          <span
                            style={{
                              display: 'block',
                              fontSize: '0.7rem',
                              color: '#9ca3af',
                              fontWeight: 400,
                            }}
                          >
                            ({s.vote_count}/{audioInfo?.validChunkCount ?? '—'})
                          </span>
                        ) : null}
                      </td>
                      {isSummaryReport ? (
                        <td style={{ ...reportStyles.td, ...reportStyles.tdSegments }}>
                          {formatSummarySegments(s.chunk_indices)}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={reportStyles.section}>
            <h2 style={reportStyles.h2}>
              {lang === 'zh' ? '3. 音訊頻譜 (Spectrogram)' : '3. Audio Spectrogram'}
            </h2>
            <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              {lang === 'zh'
                ? spectrogramVariant === 'summary'
                  ? '下圖為全部片段拼接後的 Mel 頻譜（後端運算）。'
                  : '下圖為該片段的 Mel 頻譜（後端運算）。'
                : spectrogramVariant === 'summary'
                  ? 'Stitched Mel spectrogram for all segments (server-side).'
                  : 'Mel spectrogram for this segment (server-side).'}
            </p>
            {spectrogram ? (
              <SpectrogramView
                spectrogram={spectrogram}
                chunkIndex={audioInfo?.chunkIndex ?? 0}
                variant={spectrogramVariant}
                segmentCount={spectrogramSegmentCount}
                lang={lang}
                compact
              />
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#9ca3af' }}>
                {lang === 'zh' ? '無可用頻譜資料' : 'No spectrogram available'}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* 第二頁：決策建議 */}
      <div
        className="pdf-report-page-2"
        style={reportStyles.page}
      >
        <PdfPageWatermark />
        <div style={reportStyles.contentLayer}>
          <section style={{ ...reportStyles.section, ...reportStyles.box, marginTop: 0 }}>
            <h2
              style={{
                ...reportStyles.h2,
                backgroundColor: 'transparent',
                color: '#1e3a8a',
              }}
            >
              {lang === 'zh' ? '4. 決策建議' : '4. Decision Support'}
            </h2>
            <div style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: 1.6 }}>
              <p style={{ marginBottom: '1rem' }}>
                <strong>{lang === 'zh' ? '風險分析' : 'Risk analysis'}：</strong>{' '}
                {pickLocalized(data.decision_support?.risk_analysis, lang)}
              </p>
              <p>
                <strong>{lang === 'zh' ? '行動建議' : 'Recommendation'}：</strong>{' '}
                {pickLocalized(data.decision_support?.action_recommendation, lang)}
              </p>
            </div>
          </section>

          <footer style={reportStyles.footer}>
            {pickLocalized(data.decision_support?.disclaimer, lang)}
          </footer>
        </div>
      </div>
    </div>
  );

  if (hidden) {
    return (
      <div
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        {content}
      </div>
    );
  }

  return content;
});

export default ReportGenerator;
