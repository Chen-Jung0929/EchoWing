import { formatMessage } from '../../i18n';

function confidencePercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function formatWindows(indices, windowSec) {
  return (indices ?? [])
    .slice(0, 6)
    .map((start) => `${start}–${start + windowSec}s`)
    .join(', ');
}

export default function ResultSummaryCard({
  summary,
  dict,
  lang,
  getLocalizedText,
  modelLabel,
  windowSec,
  threshold,
  xaiStatus,
}) {
  const top = summary?.predictions?.top_species?.[0] ?? null;
  const confidence = top?.probability ?? 0;
  const isLowConfidence = !top || confidence < threshold;
  const detectedWindows = formatWindows(top?.chunk_indices, windowSec);

  return (
    <section className="mb-5 rounded-2xl border border-[var(--c-primary)]/20 bg-[var(--c-primary)]/8 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[var(--c-primary)]">
            {dict.resultSummaryTitle}
          </p>
          <h3 className="mt-1 text-xl font-black text-[var(--c-text)]">
            {top ? getLocalizedText(top.name, lang) : dict.resultSummaryNoSpecies}
          </h3>
          {top?.scientific_name ? (
            <p className="text-xs italic text-[var(--c-text)]/50">{top.scientific_name}</p>
          ) : null}
        </div>
        <div className="rounded-xl bg-[var(--c-bg)]/75 px-4 py-2 text-center">
          <p className="text-[10px] font-bold uppercase text-[var(--c-text)]/45">{dict.confidenceScoreLabel}</p>
          <p className="text-2xl font-black text-[var(--c-primary)]">{confidencePercent(confidence)}</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-[var(--c-text)]/45">{dict.modelUsed}</dt>
          <dd className="font-bold text-[var(--c-text)]">{modelLabel}</dd>
        </div>
        <div>
          <dt className="text-[var(--c-text)]/45">{dict.detectedWindowsLabel}</dt>
          <dd className="font-bold text-[var(--c-text)]">{detectedWindows || dict.detectedWindowsNone}</dd>
        </div>
        <div>
          <dt className="text-[var(--c-text)]/45">{dict.xaiStatusLabel}</dt>
          <dd className="font-bold text-[var(--c-text)]">{xaiStatus}</dd>
        </div>
      </dl>

      {isLowConfidence ? (
        <p className="mt-4 rounded-xl bg-amber-500/12 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-200" role="status">
          {formatMessage(dict.resultSummaryLowConfidence, {
            threshold: Math.round(threshold * 100),
          })}
        </p>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-[var(--c-text)]/60">
        {dict.resultSummaryHint}
      </p>
    </section>
  );
}
