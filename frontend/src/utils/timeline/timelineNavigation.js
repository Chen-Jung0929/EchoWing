import { chunkTimeRangeLabel } from '../aggregateByVote';

/**
 * Display-aligned chunk covering a given second on the timeline.
 * @param {import('../aggregateByVote').ChunkEntry[]} chunks
 * @param {number} timeSec
 * @param {number} windowSec
 */
export function displayChunkForTime(chunks, timeSec, windowSec) {
  const t = Math.max(0, Number(timeSec) || 0);
  const alignedStart = Math.floor(t / windowSec) * windowSec;
  const exact = (chunks ?? []).find((c) => (c.index ?? 0) === alignedStart);
  if (exact) return exact;
  return (
    (chunks ?? []).find(
      (c) => (c.index ?? 0) <= t && t < (c.index ?? 0) + windowSec
    ) ?? chunks?.[0] ?? null
  );
}

/**
 * Top species ranked by deconvolved activity / event confidence (replaces vote aggregate UI).
 * @param {object | null} timeline
 */
export function buildTimelineSpeciesSummary(timeline) {
  if (!timeline?.species?.length) return [];

  return timeline.species
    .map((sp) => {
      const latent = sp.latent_activity ?? [];
      const maxActivity = latent.length ? Math.max(...latent, 0) : 0;
      const topEvent = (sp.events ?? []).reduce(
        (best, ev) => (!best || (ev.confidence ?? 0) > (best.confidence ?? 0) ? ev : best),
        null
      );
      return {
        species_id: sp.species_id,
        name: sp.name,
        scientific_name: sp.scientific_name ?? '',
        wiki_url_zh: sp.wiki_url_zh ?? null,
        wiki_url_en: sp.wiki_url_en ?? null,
        probability: topEvent?.confidence ?? maxActivity,
        peak_time: topEvent?.peakTime ?? null,
        max_activity: maxActivity,
      };
    })
    .filter((s) => s.probability >= 0.1)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 10);
}

/**
 * @param {object | null} selectedEvent
 * @param {number} windowSec
 * @param {import('../../i18n').LocaleMessages} dict
 * @param {(name: object, lang: string) => string} getLocalizedText
 * @param {string} lang
 */
export function timelineSelectionLabel(
  selectedEvent,
  windowSec,
  dict,
  getLocalizedText,
  lang
) {
  if (!selectedEvent) return dict.timelineOverviewLabel;
  const rangeStart = Math.floor(selectedEvent.peakTime / windowSec) * windowSec;
  const name = getLocalizedText(selectedEvent.name, lang);
  return `${name} · ${chunkTimeRangeLabel(rangeStart, windowSec)}`;
}
