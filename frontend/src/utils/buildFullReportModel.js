import { aggregateChunksByVote } from './aggregateByVote';
import { chunkTimeRangeLabel } from './aggregateByVote';
import {
  collectSpectrogramsFromChunks,
  concatSpectrogramPayloads,
  getSpectrogramFromCache,
} from './spectrogramCache';

export function buildFullReportModel({
  result,
  chunks,
  filename,
  spectrogramByIndex,
  surveyMetadata,
  confidenceThreshold = 0.8,
}) {
  const okChunks = (chunks ?? []).filter((c) => !c.error);
  const summary = aggregateChunksByVote(chunks, { confidenceThreshold });
  const sourceName = filename?.trim() && filename !== '—' ? filename.trim() : 'unknown.wav';
  const stitchedSpec = concatSpectrogramPayloads(
    collectSpectrogramsFromChunks(okChunks, spectrogramByIndex)
  );

  const segmentRows = (chunks ?? []).map((chunk) => {
    const timeLabel = chunkTimeRangeLabel(chunk.index);
    if (chunk.error) {
      return {
        index: chunk.index,
        segmentLabel: chunk.index + 1,
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
      segmentLabel: chunk.index + 1,
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
    segmentNum: chunk.index + 1,
    analysisId: chunk.analysis_id,
    error: chunk.error ?? null,
    predictions: chunk.predictions ?? null,
    decision_support: chunk.decision_support ?? null,
    spectrogram: chunk.error
      ? null
      : getSpectrogramFromCache(spectrogramByIndex, chunk.index),
    timeLabel: chunkTimeRangeLabel(chunk.index),
  }));

  return {
    sourceName,
    confidenceThreshold,
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
    durationSec: okChunks.length * 5,
    stitchedSpectrogram: stitchedSpec,
    segmentRows,
    segmentReports,
    surveyMetadata,
  };
}
