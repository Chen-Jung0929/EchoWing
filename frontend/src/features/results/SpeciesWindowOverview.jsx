import { useMemo } from 'react';

function buildRows(chunks, limit = 3) {
  const species = new Map();
  for (const chunk of chunks) {
    for (const item of chunk.predictions?.top_species ?? []) {
      const current = species.get(item.species_id) ?? {
        species_id: item.species_id,
        name: item.name,
        scientific_name: item.scientific_name,
        max: 0,
        appearances: 0,
      };
      current.max = Math.max(current.max, Number(item.probability) || 0);
      current.appearances += 1;
      species.set(item.species_id, current);
    }
  }
  return [...species.values()]
    .sort((a, b) => b.appearances - a.appearances || b.max - a.max)
    .slice(0, limit);
}

export default function SpeciesWindowOverview({
  chunks,
  windowSec,
  threshold,
  durationSec,
  dict,
  lang,
  getLocalizedText,
  onSelectWindow,
}) {
  const rows = useMemo(() => buildRows(chunks), [chunks]);
  if (!rows.length || !chunks.length) return null;

  const endSec = Math.max(durationSec || 0, ...chunks.map((chunk) => (chunk.index ?? 0) + windowSec));

  return (
    <section className="mb-6 rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/65 p-4">
      <h3 className="text-base font-black text-[var(--c-text)]">{dict.windowOverviewTitle}</h3>
      <p className="mt-1 text-xs text-[var(--c-text)]/55">{dict.windowOverviewHint}</p>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="min-w-[34rem] space-y-3">
          <div className="ml-32 flex justify-between text-[10px] font-bold text-[var(--c-text)]/40" aria-hidden>
            <span>0s</span>
            <span>{Math.round(endSec / 2)}s</span>
            <span>{Math.round(endSec)}s</span>
          </div>
          {rows.map((species) => (
            <div key={species.species_id} className="grid grid-cols-[7.5rem_1fr] items-center gap-2">
              <p className="truncate text-xs font-bold text-[var(--c-text)]" title={getLocalizedText(species.name, lang)}>
                {getLocalizedText(species.name, lang)}
              </p>
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${chunks.length}, minmax(2.25rem, 1fr))` }}
              >
                {chunks.map((chunk) => {
                  const prediction = (chunk.predictions?.top_species ?? []).find(
                    (item) => item.species_id === species.species_id
                  );
                  const probability = Number(prediction?.probability) || 0;
                  const low = probability > 0 && probability < threshold;
                  const empty = probability <= 0;
                  const start = Number(chunk.index) || 0;
                  const label = `${getLocalizedText(species.name, lang)}, ${start}–${start + windowSec}s, ${Math.round(probability * 100)}%`;
                  return (
                    <button
                      key={`${species.species_id}-${start}`}
                      type="button"
                      disabled={empty}
                      onClick={() => onSelectWindow({
                        species_id: species.species_id,
                        name: species.name,
                        scientific_name: species.scientific_name ?? '',
                        confidence: probability,
                        peakTime: start + windowSec / 2,
                        onset: start,
                        offset: start + windowSec,
                      })}
                      aria-label={label}
                      title={label}
                      className={`h-9 rounded-md border text-[10px] font-black tabular-nums transition focus-visible:ring-2 focus-visible:ring-[var(--c-primary)] ${
                        empty
                          ? 'cursor-default border-[var(--c-text)]/5 bg-[var(--c-text)]/5 text-transparent'
                          : low
                            ? 'border-amber-500/20 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:text-amber-200'
                            : 'border-[var(--c-primary)]/25 bg-[var(--c-primary)]/20 text-[var(--c-primary)] hover:bg-[var(--c-primary)]/30'
                      }`}
                    >
                      {empty ? '—' : `${Math.round(probability * 100)}%`}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[10px] text-[var(--c-text)]/45">{dict.windowOverviewLowConfidence}</p>
    </section>
  );
}
