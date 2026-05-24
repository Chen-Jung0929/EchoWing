import { forwardRef, useImperativeHandle, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import SpectrogramView from '../Visualizer/SpectrogramView';
import { sanitizeCloneForHtml2Canvas } from '../../utils/spectrogramCache';

function pickLocalized(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.zh ?? value.en ?? '';
}

const reportStyles = {
  root: {
    width: '190mm',
    padding: '2rem',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    fontFamily: 'Arial, sans-serif',
    wordBreak: 'break-word',
  },
  h1: { fontSize: '1.875rem', fontWeight: 700, color: '#166534', margin: 0 },
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
    marginBottom: '2rem',
  },
  meta: { fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' },
  section: { marginBottom: '2rem' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '0.5rem 0', borderBottom: '1px solid #d1d5db' },
  td: { padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem' },
  box: {
    padding: '1.25rem',
    border: '2px solid #bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: '0.5rem',
  },
  footer: {
    marginTop: '3rem',
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

      const baseName =
        audioInfo?.name?.replace(/\.[^/.]+$/, '') || 'birdclef_analysis';
      const suffix = data.analysis_id ?? 'report';

      const opt = {
        margin: 10,
        filename: `${baseName}_${suffix}.pdf`,
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
        pagebreak: { mode: 'css', avoid: ['section', 'footer'] },
      };

      await new Promise((resolve) => setTimeout(resolve, 400));
      await html2pdf().set(opt).from(reportRef.current).save();
    },
  }));

  if (!data) return null;

  const speciesRows = data.predictions?.top_species ?? [];
  const reportTitle =
    lang === 'zh' ? '鳥類聲學辨識分析報告' : 'Bird Acoustic Analysis Report';

  const content = (
    <div ref={reportRef} data-pdf-report-root style={reportStyles.root}>
      <header style={reportStyles.header}>
        <h1 style={reportStyles.h1}>{reportTitle}</h1>
        <p style={reportStyles.meta}>
          {lang === 'zh' ? '報告編號' : 'Report ID'}：{data.analysis_id} |{' '}
          {new Date().toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US')}
        </p>
      </header>

      <section style={reportStyles.section}>
        <h2 style={reportStyles.h2}>
          {lang === 'zh' ? '1. 樣本資訊' : '1. Sample Information'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
          <p>
            <strong>{lang === 'zh' ? '原始檔名' : 'Source file'}：</strong>{' '}
            {audioInfo?.name || '—'}
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
        </div>
      </section>

      <section style={reportStyles.section}>
        <h2 style={reportStyles.h2}>
          {lang === 'zh' ? '2. 辨識結果' : '2. Identification Results'}
        </h2>
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
                <th style={reportStyles.th}>{lang === 'zh' ? '物種名稱' : 'Species'}</th>
                <th style={{ ...reportStyles.th, textAlign: 'right' }}>
                  {lang === 'zh' ? '信心水準' : 'Confidence'}
                </th>
              </tr>
            </thead>
            <tbody>
              {speciesRows.map((s) => (
                <tr key={s.species_id}>
                  <td style={reportStyles.td}>{pickLocalized(s.name, lang)}</td>
                  <td style={{ ...reportStyles.td, textAlign: 'right' }}>
                    {(s.probability * 100).toFixed(1)}%
                  </td>
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

      <section style={{ ...reportStyles.section, ...reportStyles.box }}>
        <h2 style={{ ...reportStyles.h2, backgroundColor: 'transparent', color: '#1e3a8a' }}>
          {lang === 'zh' ? '4. 決策建議' : '4. Decision Support'}
        </h2>
        <div style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>
          <p>
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
