import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  resolveConfidenceThreshold,
} from '../config/confidenceThreshold';
import {
  aggregateChunksByVote,
  chunkTimeRangeLabel,
  modelWindowSec,
  segmentNumberFromStart,
} from './aggregateByVote';
import {
  collectSpectrogramsFromChunks,
  concatSpectrogramPayloads,
  getSpectrogramFromCache,
  trimSpectrogramToDuration,
} from './spectrogramCache';

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
}) {
  const resolvedThreshold = resolveConfidenceThreshold(confidenceThreshold);
  const okChunks = (chunks ?? []).filter((c) => !c.error);
  const summary = aggregateChunksByVote(chunks, {
    confidenceThreshold: resolvedThreshold,
    windowSec,
  });
  const sourceName = filename?.trim() && filename !== '—' ? filename.trim() : 'unknown.wav';
  let stitchedSpec = concatSpectrogramPayloads(
    collectSpectrogramsFromChunks(okChunks, spectrogramByIndex)
  );
  if (stitchedSpec && totalDurationSec > 0) {
    stitchedSpec = trimSpectrogramToDuration(stitchedSpec, totalDurationSec);
  }

  const segmentRows = (chunks ?? []).map((chunk) => {
    const timeLabel = chunkTimeRangeLabel(chunk.index, windowSec);
    const segNum = segmentNumberFromStart(chunk.index, windowSec);
    if (chunk.error) {
      return {
        index: chunk.index,
        segmentLabel: segNum,
        timeLabel,
        error: chunk.error,
        topSpeciesName: null,
        topProbability: null,
        meetsThreshold: false,
        lowConfidence: false,
      };
    }
    const top = chunk.predictions?.top_species?.[0];
    const meets = chunk.predictions?.meets_confidence_threshold === true;
    return {
      index: chunk.index,
      segmentLabel: segNum,
      timeLabel,
      error: null,
      topSpeciesName: top?.name ?? null,
      topProbability: top?.probability ?? null,
      meetsThreshold: meets,
      lowConfidence: top != null && !meets,
    };
  });

  const segmentReports = (chunks ?? []).map((chunk) => ({
    index: chunk.index,
    segmentNum: segmentNumberFromStart(chunk.index, windowSec),
    analysisId: chunk.analysis_id,
    error: chunk.error ?? null,
    predictions: chunk.predictions ?? null,
    decision_support: chunk.decision_support ?? null,
    spectrogram: chunk.error
      ? null
      : getSpectrogramFromCache(spectrogramByIndex, chunk.index),
    timeLabel: chunkTimeRangeLabel(chunk.index, windowSec),
  }));

  const lastStart = okChunks.length
    ? Math.max(...okChunks.map((c) => c.index ?? 0))
    : 0;
  const durationSec = totalDurationSec > 0 ? totalDurationSec : lastStart + windowSec;

  return {
    sourceName,
    confidenceThreshold: resolvedThreshold,
    analysisId: summary
      ? `summary_${okChunks[0]?.analysis_id ?? 'report'}`
      : chunks[0]?.analysis_id ?? 'report',
    generatedAt: new Date().toISOString(),
    summary: summary
      ? {
          predictions: summary.predictions,
          decision_support: summary.decision_support,
        }
      : null,
    okChunkCount: okChunks.length,
    totalChunkCount: chunks.length,
    durationSec,
    windowSec,
    stitchedSpectrogram: stitchedSpec,
    segmentRows,
    segmentReports,
    surveyMetadata,
  };
}
