import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  resolveConfidenceThreshold,
} from '../config/confidenceThreshold';
import { modelWindowSec } from './aggregateByVote';
import {
  concatSpectrogramsToAudioDuration,
} from './spectrogramCache';
import { buildTimelineSpeciesSummary } from './timeline/timelineNavigation';
import { mergeDuplicateConsecutiveRows } from './timeline/mergeConsecutiveEvents';
import { buildEventRangeSegments } from './timeline/eventRangeSegments';
import { buildTimelineDecisionSupport } from './timeline/buildTimelineDecisionSupport';

export function buildFullReportModel({
  chunks,
  filename,
  spectrogramByIndex,
  surveyMetadata,
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
  modelName = 'perch',
  windowSec = modelWindowSec(modelName),
  totalDurationSec = 0,
  timeline = null,
  xaiAvailable = false,
  dict = null,
}) {
  const resolvedThreshold = resolveConfidenceThreshold(confidenceThreshold);
  const okChunks = (chunks ?? []).filter((c) => !c.error);
  const sourceName = filename?.trim() && filename !== '—' ? filename.trim() : 'unknown.wav';

  const stitchedSpec = concatSpectrogramsToAudioDuration(
    okChunks,
    spectrogramByIndex,
    totalDurationSec,
    windowSec
  );

  const timelineEventRows = timeline?.species_events?.length
    ? mergeDuplicateConsecutiveRows(timeline.species_events)
    : [];

  const timelineSpeciesSummary = buildTimelineSpeciesSummary(timeline);

  const eventSegments = timeline?.species_events?.length
    ? buildEventRangeSegments(timeline.species_events)
    : [];

  const speciesReports = timelineSpeciesSummary.map((species, index) => {
    const speciesEvents = mergeDuplicateConsecutiveRows(
      timelineEventRows.filter((row) => row.species_id === species.species_id)
    );
    return {
      rank: index + 1,
      species_id: species.species_id,
      name: species.name,
      scientific_name: species.scientific_name ?? '',
      probability: species.probability ?? 0,
      peak_time: species.peak_time,
      events: speciesEvents,
      eventSegments: buildEventRangeSegments(
        (timeline?.species_events ?? []).filter(
          (ev) => ev.species_id === species.species_id
        )
      ),
    };
  });

  const firstOk = okChunks[0] ?? null;

  const lastStart = okChunks.length
    ? Math.max(...okChunks.map((c) => c.index ?? 0))
    : 0;
  const durationSec = totalDurationSec > 0 ? totalDurationSec : lastStart + windowSec;

  return {
    sourceName,
    modelName,
    confidenceThreshold: resolvedThreshold,
    analysisId: firstOk?.analysis_id || chunks[0]?.analysis_id || 'report',
    generatedAt: new Date().toISOString(),
    decisionSupport: buildTimelineDecisionSupport(timeline, { windowSec, dict }),
    okChunkCount: okChunks.length,
    totalChunkCount: chunks.length,
    durationSec,
    windowSec,
    stitchedSpectrogram: stitchedSpec,
    speciesReports,
    surveyMetadata,
    timeline,
    timelineEventRows,
    timelineSpeciesSummary,
    eventSegments,
    timelineEvents: timeline?.species_events ?? [],
    xaiAvailable,
  };
}
