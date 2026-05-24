import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReportGenerator from '../components/ReportGenerator/ReportGenerator';
import {
  aggregateChunksByVote,
  chunkTimeRangeLabel,
} from './aggregateByVote';
import { buildReportPayload } from './ChunkVisualizerSection';
import { ResultTitleBar } from './ResultTitleActions';

function formatAnalyzedAt(isoString, lang) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function SpeciesTooltipPortal({
  anchorRect,
  title,
  items,
  getLocalizedText,
  lang,
  dict,
  isReference = false,
}) {
  if (!anchorRect) return null;

  const top = anchorRect.bottom + 8;
  const centerX = anchorRect.left + anchorRect.width / 2;
  const margin = 140;
  const left = Math.min(
    Math.max(centerX, margin),
    typeof window !== 'undefined' ? window.innerWidth - margin : centerX
  );

  const content = !items?.length ? (
    <p className="text-[var(--c-text)]/50">{dict.segmentLowConfidenceHint}</p>
  ) : (
    <>
      <p className="font-black text-[var(--c-text)]/70 mb-2 border-b border-[var(--c-text)]/10 pb-1.5">
        {title}
        {isReference ? (
          <span className="ml-1 font-normal text-[var(--c-text)]/45">
            · {dict.referenceOnlyLabel}
          </span>
        ) : null}
      </p>
      <ul className="space-y-1.5">
        {items.slice(0, 5).map((sp) => (
          <li
            key={sp.species_id}
            className="flex justify-between gap-2 text-[var(--c-text)]"
          >
            <span className="truncate font-medium">
              {getLocalizedText(sp.name, lang)}
            </span>
            <span className="shrink-0 font-black text-[var(--c-primary)]">
              {Math.round((sp.probability ?? 0) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </>
  );

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[200] w-64 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-xl border border-[var(--c-text)]/15 bg-[var(--c-card)] px-3 py-2.5 text-xs shadow-xl"
      style={{ top, left }}
    >
      {content}
    </div>,
    document.body
  );
}

function ResultBadge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--c-text)]/15 bg-[var(--c-bg)]/90 px-3 py-1 text-xs font-bold text-[var(--c-text)]/80">
      {children}
    </span>
  );
}

function SegmentTab({
  label,
  ariaLabel,
  isActive,
  failed,
  lowConfidence,
  onClick,
  hoverTitle,
  hoverSpecies,
  hoverIsReference,
  getLocalizedText,
  lang,
  dict,
}) {
  const btnRef = useRef(null);
  const [tipRect, setTipRect] = useState(null);

  const showTip = () => {
    if (hoverSpecies == null && !lowConfidence) return;
    if (!btnRef.current) return;
    setTipRect(btnRef.current.getBoundingClientRect());
  };

  const hideTip = () => setTipRect(null);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? label}
        aria-current={isActive ? 'true' : undefined}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        className={`min-w-0 w-full rounded-md border py-1.5 text-center text-[11px] font-bold leading-tight transition-all sm:text-xs ${
          isActive
            ? 'bg-[var(--c-primary)] text-[var(--c-bg)] border-transparent shadow-sm'
            : failed
              ? 'bg-red-500/10 text-red-600 border-red-500/30'
              : lowConfidence
                ? 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200'
                : 'bg-[var(--c-bg)]/80 text-[var(--c-text)]/70 border-[var(--c-text)]/10 hover:border-[var(--c-primary)]/40'
        }`}
      >
        <span className="block truncate px-0.5">{label}</span>
        {failed ? <span className="text-[10px] opacity-80">!</span> : null}
        {!failed && lowConfidence ? (
          <span className="text-[10px] opacity-80">?</span>
        ) : null}
      </button>
      {tipRect && (
        <SpeciesTooltipPortal
          anchorRect={tipRect}
          title={hoverTitle}
          items={hoverSpecies}
          getLocalizedText={getLocalizedText}
          lang={lang}
          dict={dict}
          isReference={hoverIsReference}
        />
      )}
    </>
  );
}

/**
 * 總覽 + 分段 tab 切換結果視圖。
 * Part A（標題、徽章、tabs）在切換分頁時固定顯示於上方。
 */
export default function ChunkResultsView({
  result,
  dict,
  lang,
  getLocalizedText,
  renderChunkBody,
  resetToLanding,
  spectrogramByIndex = {},
}) {
  const chunks = result.chunks ?? [];
  const tabCount = 1 + chunks.length;
  const [pageIndex, setPageIndex] = useState(0);
  const reportRef = useRef(null);

  const summary = useMemo(
    () =>
      aggregateChunksByVote(chunks, {
        confidenceThreshold: result.confidence_threshold ?? 0.8,
      }),
    [chunks, result.confidence_threshold]
  );
  const okChunks = chunks.filter((c) => !c.error);

  const isSummaryPage = pageIndex === 0;
  const activeChunk = !isSummaryPage ? chunks[pageIndex - 1] : null;

  const filename = result.original_filename?.trim() || '—';

  const summaryChunk = summary
    ? {
        index: -1,
        predictions: summary.predictions,
        decision_support: summary.decision_support,
      }
    : null;

  const reportPayload = useMemo(
    () =>
      buildReportPayload({
        isSummaryPage,
        summaryChunk,
        activeChunk,
        okChunks,
        filename,
        spectrogramCache: spectrogramByIndex,
      }),
    [
      isSummaryPage,
      summaryChunk,
      activeChunk,
      okChunks,
      filename,
      spectrogramByIndex,
    ]
  );

  const handleDownloadResult = useCallback(async () => {
    console.log('handleDownloadResult');
    if (!reportRef.current?.downloadPdf) {
      throw new Error('PDF report is not ready');
    }
    await reportRef.current.downloadPdf();
  }, []);

  const confidenceThreshold = result.confidence_threshold ?? 0.8;
  const thresholdPct = Math.round(confidenceThreshold * 100);

  const summaryHoverSpecies = summary?.predictions?.top_species;
  const summaryLowConfidence = summary?.predictions?.meets_confidence_threshold === false;

  const tabGridStyle = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))`,
      gap: '4px',
    }),
    [tabCount]
  );

  return (
    <div className="w-full max-w-4xl bg-[var(--c-card)]/82 backdrop-blur-md p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[var(--c-text)]/5">
      {reportPayload ? (
        <ReportGenerator
          key={reportPayload.data.analysis_id}
          ref={reportRef}
          data={reportPayload.data}
          audioInfo={reportPayload.audioInfo}
          spectrogram={reportPayload.spectrogram}
          spectrogramVariant={reportPayload.spectrogramVariant}
          spectrogramSegmentCount={reportPayload.spectrogramSegmentCount}
          lang={lang}
          hidden
        />
      ) : null}
      {/* Part A — overflow-visible 避免裁切 tooltip */}
      <div className="sticky top-24 z-10 -mx-2 px-2 py-4 mb-2 overflow-visible bg-[var(--c-card)]/95 backdrop-blur-md border-b border-[var(--c-text)]/10">
        <header className="mb-4 mt-2">
          <ResultTitleBar dict={dict} onDownload={handleDownloadResult} />


          <details className="mt-2 flex flex-col items-center max-w-full">
            <summary className="cursor-pointer text-xs text-[var(--c-text)]/45 hover:text-[var(--c-primary)] transition-colors list-none [&::-webkit-details-marker]:hidden">
              <span className="underline decoration-dotted underline-offset-2">
                {dict.sourceFile}
              </span>
            </summary>
            <p className="mt-1 text-xs text-[var(--c-text)]/50 break-all px-1 max-w-md mx-auto">
              {filename}
            </p>
          </details>


          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <ResultBadge>
              {dict.chunksCount} · {chunks.length}
            </ResultBadge>
            <ResultBadge>
              {dict.validChunks} · {summary?.validChunkCount ?? okChunks.length}
            </ResultBadge>
            <ResultBadge>
              {dict.confidenceThresholdBadge.replace('{threshold}', String(thresholdPct))}
            </ResultBadge>
          </div>
        </header>

        {result.warnings?.length > 0 && (
          <section className="mb-4 bg-amber-500/10 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200">
            <p className="font-black mb-1">{dict.warnings}</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
        )}

        <nav
          className="w-full overflow-visible pb-1"
          style={tabGridStyle}
          aria-label={dict.resultTitle}
        >
          <SegmentTab
            label={dict.summaryTabShort}
            ariaLabel={dict.summaryLabel}
            isActive={pageIndex === 0}
            failed={false}
            lowConfidence={summaryLowConfidence}
            onClick={() => setPageIndex(0)}
            hoverTitle={dict.topSpecies}
            hoverSpecies={summaryHoverSpecies}
            hoverIsReference={false}
            getLocalizedText={getLocalizedText}
            lang={lang}
            dict={dict}
          />
          {chunks.map((chunk, i) => {
            const page = i + 1;
            const n = chunk.index + 1;
            const fullLabel = `${dict.chunkLabel} ${n}`;
            const preds = chunk.predictions;
            const meets = preds?.meets_confidence_threshold ?? (preds?.top_species?.length > 0);
            const hoverSpecies = chunk.error
              ? []
              : meets
                ? preds?.top_species
                : preds?.reference_species;
            return (
              <SegmentTab
                key={chunk.analysis_id ?? chunk.index}
                label={String(n)}
                ariaLabel={`${fullLabel} · ${chunkTimeRangeLabel(chunk.index)}`}
                isActive={pageIndex === page}
                failed={Boolean(chunk.error)}
                lowConfidence={!chunk.error && preds && !meets}
                onClick={() => setPageIndex(page)}
                hoverTitle={`${fullLabel} · ${chunkTimeRangeLabel(chunk.index)}`}
                hoverSpecies={hoverSpecies}
                hoverIsReference={!chunk.error && preds && !meets}
                getLocalizedText={getLocalizedText}
                lang={lang}
                dict={dict}
              />
            );
          })}
        </nav>
        <p className="mt-2 text-center text-[10px] text-[var(--c-text)]/40">
          {dict.tabHoverHint}
        </p>
      </div>

      {/* Part B */}
      <div className="mt-4 min-h-[12rem]">
        {isSummaryPage ? (
          summaryChunk ? (
            <div>
              <p className="text-xs text-[var(--c-text)]/50 mb-4 text-center">
                {dict.voteModeHint}
              </p>
              {renderChunkBody(summaryChunk, {
                isSummary: true,
                confidenceThreshold,
                spectrogramByIndex,
                resultChunks: chunks,
              })}
            </div>
          ) : (
            <p className="text-center text-red-500 py-8">{dict.errorTitle}</p>
          )
        ) : activeChunk?.error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-red-500 font-bold">{dict.decodeFailed}</p>
            <p className="text-sm text-[var(--c-text)]/60 mt-2">{activeChunk.error}</p>
          </div>
        ) : (
          renderChunkBody(activeChunk, {
            isSummary: false,
            confidenceThreshold,
            spectrogramByIndex,
            resultChunks: chunks,
          })
        )}
      </div>

      {okChunks.length === 0 && (
        <p className="text-center text-red-500 text-sm mt-4">{dict.errorTitle}</p>
      )}

      <details className="mt-6 bg-[var(--c-bg)]/50 rounded-xl p-4">
        <summary className="cursor-pointer font-bold text-[var(--c-text)]/70 text-sm">
          {dict.rawResponse}
        </summary>
        <pre className="mt-3 text-xs overflow-auto max-h-64 text-[var(--c-text)]/80">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>

      <div className="text-center mt-8">
        <button
          type="button"
          onClick={resetToLanding}
          className="text-[var(--c-primary)] font-bold underline"
        >
          {dict.backBtn}
        </button>
      </div>
    </div>
  );
}
