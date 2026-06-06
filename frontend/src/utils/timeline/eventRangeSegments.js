import {
  getEventPeakTimes,
  groupPeakTimesIntoRanges,
  mergeDuplicateConsecutiveRows,
} from './mergeConsecutiveEvents.js';

export const SPECIES_MARKER_COLORS = [
  '#0d9488',
  '#6366f1',
  '#e11d48',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#65a30d',
  '#db2777',
  '#2563eb',
  '#ca8a04',
];

/**
 * @param {string} speciesId
 * @param {string[]} orderedSpeciesIds
 */
export function getSpeciesMarkerColor(speciesId, orderedSpeciesIds) {
  const idx = orderedSpeciesIds.indexOf(speciesId);
  const slot = idx >= 0 ? idx : orderedSpeciesIds.length;
  return SPECIES_MARKER_COLORS[slot % SPECIES_MARKER_COLORS.length];
}

/**
 * @param {{ start: number, end: number }} range
 */
export function formatSegmentRangeLabel({ start, end }) {
  return start === end ? `${start}s` : `${start}~${end}s`;
}

/**
 * Assign vertical lanes so overlapping segments remain readable.
 * @param {{ start: number, end: number }[]} segments
 */
export function assignSegmentLanes(segments) {
  /** @type {number[]} */
  const laneEnds = [];

  return segments.map((seg) => {
    let lane = laneEnds.findIndex((end) => seg.start > end);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(seg.end);
    } else {
      laneEnds[lane] = seg.end;
    }
    return { ...seg, lane };
  });
}

/**
 * Table-aligned range segments for spectrogram labels (one label per contiguous peak range).
 * @param {object[]} events
 */
export function buildEventRangeSegments(events) {
  const rows = mergeDuplicateConsecutiveRows(events ?? []);
  const speciesOrder = rows.map((row) => row.species_id);

  /** @type {object[]} */
  const raw = [];
  for (const row of rows) {
    const color = getSpeciesMarkerColor(row.species_id, speciesOrder);
    for (const range of groupPeakTimesIntoRanges(getEventPeakTimes(row))) {
      raw.push({
        species_id: row.species_id,
        name: row.name,
        start: range.start,
        end: range.end,
        event: row,
        color,
        rangeLabel: formatSegmentRangeLabel(range),
      });
    }
  }

  raw.sort((a, b) => a.start - b.start || a.end - b.end);
  return assignSegmentLanes(raw);
}

/**
 * @param {ReturnType<typeof buildEventRangeSegments>} segments
 * @param {number} startSec
 * @param {number} endSec
 */
export function filterEventRangeSegments(segments, startSec, endSec) {
  return (segments ?? []).filter((seg) => seg.start <= endSec && seg.end >= startSec);
}

/**
 * @param {object | null | undefined} selectedEvent
 * @param {{ species_id?: string, start: number, end: number, event?: object }} segment
 */
export function segmentMatchesSelection(selectedEvent, segment) {
  if (!selectedEvent || !segment) return false;
  if (selectedEvent.species_id !== segment.species_id) return false;
  const peaks = getEventPeakTimes(selectedEvent);
  for (let t = segment.start; t <= segment.end; t += 1) {
    if (peaks.includes(t)) return true;
  }
  return false;
}
