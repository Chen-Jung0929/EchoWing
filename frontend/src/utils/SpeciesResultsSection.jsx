import { useState } from 'react';
import { MdExpandMore, MdExpandLess, MdInfoOutline } from 'react-icons/md';
import { formatMessage } from '../i18n';
import ExpandableSpeciesList from './ExpandableSpeciesList';

const DEFAULT_THRESHOLD = 0.8;

function thresholdPercent(threshold) {
  return Math.round((threshold ?? DEFAULT_THRESHOLD) * 100);
}

export default function SpeciesResultsSection({
  predictions,
  confidenceThreshold = DEFAULT_THRESHOLD,
  dict,
  lang,
  isSummary = false,
  getLocalizedText,
  previewCount = 5,
}) {
  const [showReference, setShowReference] = useState(false);
  const topSpecies = predictions?.top_species ?? [];
  const referenceSpecies = predictions?.reference_species ?? [];
  const meetsThreshold =
    predictions?.meets_confidence_threshold ?? topSpecies.length > 0;
  const thresholdPct = thresholdPercent(confidenceThreshold);

  if (meetsThreshold && topSpecies.length > 0) {
    return (
      <ExpandableSpeciesList
        species={topSpecies}
        dict={dict}
        lang={lang}
        isSummary={isSummary}
        getLocalizedText={getLocalizedText}
        previewCount={previewCount}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
        role="status"
      >
        <div className="flex items-start gap-3">
          <MdInfoOutline
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <div>
            <p className="font-black text-amber-900 dark:text-amber-100">
              {formatMessage(dict.lowConfidenceTitle, { threshold: thresholdPct })}
            </p>
            <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
              {formatMessage(dict.lowConfidenceBody, { threshold: thresholdPct })}
            </p>
          </div>
        </div>
      </div>

      {referenceSpecies.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setShowReference((open) => !open)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--c-text)]/20 py-3 text-sm font-bold text-[var(--c-text)]/70 transition-colors hover:border-[var(--c-text)]/35 hover:bg-[var(--c-text)]/5"
          >
            {showReference ? (
              <>
                <MdExpandLess className="h-5 w-5" aria-hidden />
                {dict.hideReferenceSpecies}
              </>
            ) : (
              <>
                <MdExpandMore className="h-5 w-5" aria-hidden />
                {formatMessage(dict.showReferenceSpecies, {
                  count: referenceSpecies.length,
                })}
              </>
            )}
          </button>
          {showReference ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-[var(--c-text)]/50">{dict.referenceSpeciesHint}</p>
              <ExpandableSpeciesList
                species={referenceSpecies}
                dict={dict}
                lang={lang}
                isSummary={isSummary}
                getLocalizedText={getLocalizedText}
                previewCount={previewCount}
                muted
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[var(--c-text)]/50">{dict.noSpeciesHint}</p>
      )}
    </div>
  );
}
