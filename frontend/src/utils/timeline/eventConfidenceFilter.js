/** 一般事件最低信心（0–1） */
export const MIN_EVENT_CONFIDENCE = 0.1;

/** 邊界區事件最低信心（0–1） */
export const MIN_BOUNDARY_EVENT_CONFIDENCE = 0.2;

/**
 * @param {{ confidence?: number, boundaryFlags?: { onsetLow?: boolean, offsetLow?: boolean } }} event
 */
export function passesEventConfidenceFilter(event) {
  const confidence = event?.confidence ?? 0;
  const isBoundary =
    Boolean(event?.boundaryFlags?.onsetLow) || Boolean(event?.boundaryFlags?.offsetLow);
  const threshold = isBoundary ? MIN_BOUNDARY_EVENT_CONFIDENCE : MIN_EVENT_CONFIDENCE;
  return confidence >= threshold;
}

/**
 * @param {object[]} species
 */
export function filterTimelineSpecies(species) {
  return (species ?? [])
    .map((sp) => ({
      ...sp,
      events: (sp.events ?? []).filter(passesEventConfidenceFilter),
    }))
    .filter((sp) => sp.events.length > 0);
}
