import { detectSpeciesEvents } from './detectSpeciesEvents.js';
import { filterTimelineSpecies } from './eventConfidenceFilter.js';
import { mergeConsecutiveEvents } from './mergeConsecutiveEvents.js';

/**
 * Merge backend timeline_deconv payload with frontend peak-detection events.
 * @param {object | null | undefined} timelineDeconv
 * @returns {object | null}
 */
export function buildTimelineModel(timelineDeconv) {
  if (!timelineDeconv?.species_curves?.length) {
    return timelineDeconv
      ? {
          ...timelineDeconv,
          species: [],
          maxCoverage: Math.max(...(timelineDeconv.coverage ?? [1]), 1),
        }
      : null;
  }

  const maxCoverage = Math.max(...(timelineDeconv.coverage ?? [1]), 1);
  const species = filterTimelineSpecies(
    timelineDeconv.species_curves.map((curve) => ({
      ...curve,
      events: detectSpeciesEvents({
        latentActivity: curve.latent_activity,
        coverage: timelineDeconv.coverage,
        boundaryLowSec: timelineDeconv.boundary_low_sec ?? 0,
        durationSec: timelineDeconv.duration_sec,
        maxCoverage,
      }),
    }))
  ).map((sp) => ({
    ...sp,
    events: mergeConsecutiveEvents(sp.events ?? []),
  }));

  const allEvents = species.flatMap((sp) =>
    (sp.events ?? []).map((ev) => ({
      ...ev,
      species_id: sp.species_id,
      name: sp.name,
      scientific_name: sp.scientific_name,
    }))
  );

  allEvents.sort((a, b) => b.confidence - a.confidence || a.peakTime - b.peakTime);

  return {
    ...timelineDeconv,
    species,
    species_events: allEvents,
    maxCoverage,
  };
}
