import { detectSpeciesEvents, findPeaks } from '../src/utils/timeline/detectSpeciesEvents.js';
import { buildTimelineModel } from '../src/utils/timeline/buildTimelineModel.js';
import { buildTimelineFromChunks } from '../src/utils/timeline/clientDeconv.js';
import { ensureTimeline } from '../src/utils/timeline/ensureTimeline.js';
import {
  passesEventConfidenceFilter,
  filterTimelineSpecies,
} from '../src/utils/timeline/eventConfidenceFilter.js';
import {
  mergeConsecutiveEvents,
  mergeDuplicateConsecutiveRows,
  formatPeakTimeRange,
  groupPeakTimesIntoRanges,
} from '../src/utils/timeline/mergeConsecutiveEvents.js';
import { buildEventRangeSegments } from '../src/utils/timeline/eventRangeSegments.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const latent = [0, 0, 0.1, 0.8, 0.6, 0.2, 0, 0];
const peaks = findPeaks(latent, 0.2);
assert(peaks.includes(3), 'peak at index 3');

const events = detectSpeciesEvents({
  latentActivity: latent,
  coverage: [1, 2, 3, 4, 5, 4, 3, 2],
  boundaryLowSec: 2,
  durationSec: 8,
});
assert(events.length >= 1, 'at least one event');
assert(events[0].peakTime === 3, 'peak time is 3');
assert(events[0].onset <= 3, 'onset before peak');
assert(events[0].offset >= 3, 'offset after peak');

const model = buildTimelineModel({
  event: 'timeline_deconv',
  duration_sec: 8,
  window_sec: 5,
  stride_sec: 1,
  window_starts: [0, 1, 2],
  coverage: [1, 2, 3, 3, 2, 1, 1, 1],
  boundary_low_sec: 4,
  species_curves: [
    {
      species_id: 'sp1',
      name: { zh: '測試', en: 'Test' },
      observed_evidence: [0.1, 0.5, 0.8],
      latent_activity: latent,
    },
  ],
});
assert(model.species_events.length >= 1, 'model has species events');
assert(model.species[0].events.length >= 1, 'species has events');

const clientPayload = buildTimelineFromChunks(
  [
    {
      index: 0,
      predictions: {
        top_species: [
          {
            species_id: 'sp1',
            name: { zh: '測試', en: 'Test' },
            probability: 0.8,
          },
        ],
        reference_species: [],
      },
    },
    {
      index: 1,
      predictions: {
        top_species: [
          {
            species_id: 'sp1',
            name: { zh: '測試', en: 'Test' },
            probability: 0.6,
          },
        ],
        reference_species: [],
      },
    },
  ],
  { durationSec: 8, windowSec: 5, strideSec: 1 }
);
assert(clientPayload?.species_curves?.length === 1, 'client deconv produces curves');

const ensured = ensureTimeline({
  chunks: [
    {
      index: 0,
      predictions: {
        top_species: [
          {
            species_id: 'sp2',
            name: { zh: '麻雀', en: 'Sparrow' },
            probability: 0.9,
          },
        ],
        reference_species: [],
      },
    },
    {
      index: 1,
      predictions: {
        top_species: [
          {
            species_id: 'sp2',
            name: { zh: '麻雀', en: 'Sparrow' },
            probability: 0.85,
          },
        ],
        reference_species: [],
      },
    },
  ],
  stream_meta: { total_duration_sec: 8, window_sec: 5, stride_sec: 1 },
});
assert(ensured?.species?.length >= 1, 'ensureTimeline fallback works');

assert(
  passesEventConfidenceFilter({ confidence: 0.11, boundaryFlags: { onsetLow: false, offsetLow: false } }),
  'passes 10% interior'
);
assert(
  !passesEventConfidenceFilter({ confidence: 0.09, boundaryFlags: { onsetLow: false, offsetLow: false } }),
  'rejects below 10% interior'
);
assert(
  !passesEventConfidenceFilter({ confidence: 0.15, boundaryFlags: { onsetLow: true, offsetLow: false } }),
  'rejects below 20% boundary'
);
assert(
  passesEventConfidenceFilter({ confidence: 0.21, boundaryFlags: { onsetLow: false, offsetLow: true } }),
  'passes 20% boundary'
);

const filtered = filterTimelineSpecies([
  {
    species_id: 'a',
    events: [
      { confidence: 0.05, boundaryFlags: { onsetLow: false, offsetLow: false } },
      { confidence: 0.12, boundaryFlags: { onsetLow: false, offsetLow: false } },
    ],
  },
  {
    species_id: 'b',
    events: [{ confidence: 0.08, boundaryFlags: { onsetLow: false, offsetLow: false } }],
  },
]);
assert(filtered.length === 1 && filtered[0].events.length === 1, 'filter species by confidence');

const mergedAdjacent = mergeConsecutiveEvents([
  { onset: 2, offset: 4, peakTime: 3, confidence: 0.5, peakActivity: 0.8 },
  { onset: 5, offset: 7, peakTime: 6, confidence: 0.7, peakActivity: 0.9 },
]);
assert(mergedAdjacent.length === 1, 'merge adjacent same-species intervals');
assert(mergedAdjacent[0].onset === 2 && mergedAdjacent[0].offset === 7, 'merged onset/offset span');
assert(mergedAdjacent[0].peakTime === 6, 'merged peak follows higher confidence');
assert(
  JSON.stringify(mergedAdjacent[0].peakTimes) === JSON.stringify([3, 6]),
  'merged adjacent keeps all peak seconds'
);

const mergedSeparate = mergeConsecutiveEvents([
  { onset: 2, offset: 4, peakTime: 3, confidence: 0.5 },
  { onset: 8, offset: 10, peakTime: 9, confidence: 0.6 },
]);
assert(mergedSeparate.length === 2, 'keep non-adjacent events separate');

const dedupedRows = mergeDuplicateConsecutiveRows([
  { species_id: 'a', onset: 3, offset: 5, peakTime: 4, confidence: 0.4 },
  { species_id: 'a', onset: 3, offset: 5, peakTime: 4, confidence: 0.6 },
  { species_id: 'b', onset: 3, offset: 5, peakTime: 4, confidence: 0.5 },
]);
assert(dedupedRows.length === 2, 'one row per species after table merge');
assert(dedupedRows[0].confidence === 0.6, 'dedupe keeps max confidence for species');

const mergedPeakRange = mergeDuplicateConsecutiveRows([
  { species_id: 'a', name: { zh: '測試' }, onset: 5, offset: 10, peakTime: 7, confidence: 0.6 },
  { species_id: 'a', name: { zh: '測試' }, onset: 5, offset: 10, peakTime: 8, confidence: 0.6 },
  { species_id: 'a', name: { zh: '測試' }, onset: 5, offset: 10, peakTime: 9, confidence: 0.6 },
]);
assert(mergedPeakRange.length === 1, 'merge same-species rows into one');
assert(
  formatPeakTimeRange(mergedPeakRange[0]) === '7~9s',
  'consecutive peaks shown as one range'
);
assert(mergedPeakRange[0].confidence === 0.6, 'merged row keeps max confidence');

const splitPeaks = mergeDuplicateConsecutiveRows([
  { species_id: 'a', onset: 5, offset: 10, peakTime: 7, confidence: 0.6 },
  { species_id: 'a', onset: 5, offset: 10, peakTime: 9, confidence: 0.6 },
]);
assert(splitPeaks.length === 1, 'same max confidence merges into one species row');
assert(formatPeakTimeRange(splitPeaks[0]) === '7s, 9s', 'non-consecutive peaks stay separate');

const lowerConfDropped = mergeDuplicateConsecutiveRows([
  { species_id: 'a', onset: 2, offset: 4, peakTime: 3, confidence: 0.8 },
  { species_id: 'a', onset: 12, offset: 14, peakTime: 13, confidence: 0.4 },
]);
assert(lowerConfDropped.length === 1, 'one row for species');
assert(formatPeakTimeRange(lowerConfDropped[0]) === '3s', 'only max-confidence peaks kept');

const mergedDifferentBounds = mergeDuplicateConsecutiveRows([
  { species_id: 'a', onset: 5, offset: 7, peakTime: 7, confidence: 0.6 },
  { species_id: 'a', onset: 6, offset: 8, peakTime: 8, confidence: 0.6 },
  { species_id: 'a', onset: 7, offset: 9, peakTime: 9, confidence: 0.6 },
]);
assert(mergedDifferentBounds.length === 1, 'merge consecutive peaks at same max confidence');
assert(formatPeakTimeRange(mergedDifferentBounds[0]) === '7~9s', 'peak range 7~9 with differing bounds');

const tiedMaxConf = mergeDuplicateConsecutiveRows([
  { species_id: 'a', onset: 2, offset: 5, peakTime: 3, peakTimes: [3, 4, 5], confidence: 0.8 },
  { species_id: 'a', onset: 11, offset: 14, peakTime: 12, peakTimes: [12, 13, 14], confidence: 0.8 },
  { species_id: 'a', onset: 19, offset: 21, peakTime: 20, confidence: 0.5 },
]);
assert(tiedMaxConf.length === 1, 'one row per species when max confidence ties');
assert(
  formatPeakTimeRange(tiedMaxConf[0]) === '3~5s, 12~14s',
  'merge peaks from all max-confidence events into ranges'
);

const groupedRanges = groupPeakTimesIntoRanges([3, 4, 5, 7, 8, 10, 12, 13, 14]);
assert(
  groupedRanges.length === 4 &&
    groupedRanges[0].start === 3 &&
    groupedRanges[0].end === 5 &&
    groupedRanges[1].start === 7 &&
    groupedRanges[1].end === 8 &&
    groupedRanges[2].start === 10 &&
    groupedRanges[2].end === 10 &&
    groupedRanges[3].start === 12 &&
    groupedRanges[3].end === 14,
  'group consecutive peak seconds into ranges'
);

assert(
  formatPeakTimeRange({ peakTimes: [3, 4, 5, 7, 8, 10, 12, 13, 14] }) ===
    '3~5s, 7~8s, 10s, 12~14s',
  'format merged peak ranges for display'
);
assert(formatPeakTimeRange({ peakTime: 7, peakTimeEnd: 9 }) === '7~9s', 'peak range uses start~end');
assert(formatPeakTimeRange({ peakTime: 7, peakTimes: [7, 8, 9] }) === '7~9s', 'peakTimes as range');
assert(formatPeakTimeRange({ peakTime: 3, peakTimes: [3, 6] }) === '3s, 6s', 'non-consecutive peaks');
assert(formatPeakTimeRange({ peakTime: 7 }) === '7s', 'single peak second');

const spectrogramSegments = buildEventRangeSegments([
  { species_id: 'a', name: { zh: 'A' }, onset: 2, offset: 5, peakTimes: [3, 4, 5], confidence: 0.8 },
  { species_id: 'b', name: { zh: 'B' }, onset: 6, offset: 8, peakTimes: [7, 8], confidence: 0.7 },
  { species_id: 'a', onset: 9, offset: 10, peakTime: 10, confidence: 0.4 },
]);
assert(spectrogramSegments.length === 2, 'one label per contiguous peak range at max confidence');
assert(
  spectrogramSegments.some((s) => s.species_id === 'a' && s.start === 3 && s.end === 5 && s.rangeLabel === '3~5s'),
  'segment range label'
);
assert(
  spectrogramSegments.some((s) => s.species_id === 'b' && s.start === 7 && s.end === 8 && s.rangeLabel === '7~8s'),
  'second species segment'
);
assert(
  new Set(spectrogramSegments.map((s) => s.color)).size === 2,
  'different species use different colors'
);

console.log('validate-timeline: OK');
