import { useState } from 'react';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';

const DEFAULT_PREVIEW = 5;

export default function ExpandableSpeciesList({
  species,
  dict,
  lang,
  isSummary = false,
  getLocalizedText,
  previewCount = DEFAULT_PREVIEW,
  muted = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const all = Array.isArray(species) ? species : [];
  const hasMore = all.length > previewCount;
  const visible = expanded ? all : all.slice(0, previewCount);

  if (all.length === 0) {
    return (
      <p className="text-sm text-[var(--c-text)]/50">{dict.noSpeciesHint}</p>
    );
  }

  return (
    <div className="space-y-4">
      {visible.map((s) => (
        <div
          key={s.species_id}
          className={`rounded-xl border p-4 ${
            muted
              ? 'border-[var(--c-text)]/10 bg-[var(--c-text)]/[0.03] opacity-80'
              : 'border-[var(--c-text)]/10'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-black text-[var(--c-text)]">
                {getLocalizedText(s.name, lang)}
              </p>
              <p className="text-xs text-[var(--c-text)]/50">
                {dict.speciesId}: {s.species_id}
              </p>
              {isSummary && s.vote_count != null && (
                <p className="mt-1 text-xs text-[var(--c-primary)]/80">
                  {dict.voteCount}: {s.vote_count}
                  {s.chunk_indices?.length > 0 && (
                    <>
                      {' '}
                      · {dict.appearsInChunks}:{' '}
                      {s.chunk_indices.map((i) => i + 1).join('、')}
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-[var(--c-text)]/50">
                {muted ? dict.referenceOnlyLabel : isSummary ? dict.percent : dict.probability}
              </p>
              <p
                className={`text-2xl font-black ${
                  muted ? 'text-[var(--c-text)]/60' : 'text-[var(--c-primary)]'
                }`}
              >
                {Math.round(s.probability * 100)}%
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--c-text)]/10">
            <div
              className={`h-full rounded-full ${
                muted ? 'bg-[var(--c-text)]/25' : 'bg-[var(--c-primary)]'
              }`}
              style={{ width: `${s.probability * 100}%` }}
            />
          </div>
        </div>
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--c-text)]/20 py-3 text-sm font-bold text-[var(--c-primary)] transition-colors hover:border-[var(--c-primary)]/40 hover:bg-[var(--c-primary)]/5"
        >
          {expanded ? (
            <>
              <MdExpandLess className="h-5 w-5" aria-hidden />
              {dict.collapseSpeciesList}
            </>
          ) : (
            <>
              <MdExpandMore className="h-5 w-5" aria-hidden />
              {dict.expandSpeciesList.replace('{count}', String(all.length - previewCount))}
            </>
          )}
        </button>
      )}
    </div>
  );
}
