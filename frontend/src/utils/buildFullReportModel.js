import {

  DEFAULT_CONFIDENCE_THRESHOLD,

  resolveConfidenceThreshold,

} from '../config/confidenceThreshold';

import {

  chunkTimeRangeLabel,

  modelWindowSec,

  segmentNumberFromStart,

} from './aggregateByVote';

import {

  concatSpectrogramsToAudioDuration,

  getSpectrogramFromCache,

  trimSpectrogramToDuration,

} from './spectrogramCache';

import { buildTimelineSpeciesSummary } from './timeline/timelineNavigation';

import { mergeDuplicateConsecutiveRows } from './timeline/mergeConsecutiveEvents';

import { buildEventRangeSegments } from './timeline/eventRangeSegments';
import { buildTimelineDecisionSupport } from './timeline/buildTimelineDecisionSupport';



export function buildFullReportModel({

  result,

  chunks,

  filename,

  spectrogramByIndex,

  surveyMetadata,

  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,

  modelName = 'perch',

  windowSec = modelWindowSec(modelName),

  totalDurationSec = 0,

  timeline = null,

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



  const firstOk = okChunks[0] ?? null;

  const segmentReports = (chunks ?? []).map((chunk) => ({

    index: chunk.index,

    segmentNum: segmentNumberFromStart(chunk.index, windowSec),

    analysisId: chunk.analysis_id,

    error: chunk.error ?? null,

    predictions: chunk.predictions ?? null,

    decision_support: chunk.decision_support ?? null,

    spectrogram: chunk.error

      ? null

      : trimSpectrogramToDuration(

          getSpectrogramFromCache(spectrogramByIndex, chunk.index),

          Math.min(windowSec, Math.max(0, (totalDurationSec || windowSec) - (chunk.index ?? 0)))

        ),

    timeLabel: chunkTimeRangeLabel(chunk.index, windowSec),

  }));



  const lastStart = okChunks.length

    ? Math.max(...okChunks.map((c) => c.index ?? 0))

    : 0;

  const durationSec = totalDurationSec > 0 ? totalDurationSec : lastStart + windowSec;



  return {

    sourceName,

    modelName,

    confidenceThreshold: resolvedThreshold,

    analysisId: firstOk?.analysis_id ?? chunks[0]?.analysis_id ?? 'report',

    generatedAt: new Date().toISOString(),

    decisionSupport: buildTimelineDecisionSupport(timeline, { windowSec }),

    okChunkCount: okChunks.length,

    totalChunkCount: chunks.length,

    durationSec,

    windowSec,

    stitchedSpectrogram: stitchedSpec,

    segmentReports,

    surveyMetadata,

    timeline,

    timelineEventRows,

    timelineSpeciesSummary,

    eventSegments,

    timelineEvents: timeline?.species_events ?? [],

  };

}


