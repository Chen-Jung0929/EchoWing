import SpectrogramView from '../components/Visualizer/SpectrogramView';
import { modelWindowSec, segmentNumberFromStart } from './aggregateByVote';
import {
  collectSpectrogramsFromChunks,
  concatSpectrogramsToAudioDuration,
  getSpectrogramFromCache,
  stitchXaiHeatmap,
  trimSpectrogramToDuration,
} from './spectrogramCache';

export default function ChunkVisualizerSection({
  chunk,
  isSummary,
  resultChunks,
  spectrogramCache,
  dict,
  lang,
  totalDurationSec,
  xaiPending = false,
  eventMarkers = null,
  markerDurationSec = 0,
  selectedEvent = null,
  onSelectEvent = null,
  getLocalizedText = null,
  shellMarginTop = null,
}) {
  const modelName = resultChunks?.[0]?.model_name ?? chunk?.model_name ?? 'perch';
  const windowSec = modelWindowSec(modelName);

  if (isSummary) {
    const durationSec =
      totalDurationSec > 0
        ? totalDurationSec
        : collectSpectrogramsFromChunks(resultChunks, spectrogramCache).length * windowSec;

    const stitched = concatSpectrogramsToAudioDuration(
      resultChunks,
      spectrogramCache,
      durationSec,
      windowSec
    );
    if (!stitched) return null;

    const stitchedXai = stitchXaiHeatmap(
      resultChunks,
      stitched.time_frames,
      durationSec,
      windowSec
    );

    const summaryXaiGenerating =
      xaiPending &&
      resultChunks.some(
        (c) =>
          c?.predictions?.meets_confidence_threshold &&
          !(c?.predictions?.xai_heatmap?.length)
      );

    return (
      <SpectrogramView
        spectrogram={stitched}
        variant="summary"
        segmentCount={collectSpectrogramsFromChunks(resultChunks, spectrogramCache).length}
        dict={dict}
        lang={lang}
        xaiHeatmap={stitchedXai}
        xaiGenerating={summaryXaiGenerating}
        eventMarkers={eventMarkers}
        markerDurationSec={markerDurationSec}
        selectedEvent={selectedEvent}
        onSelectEvent={onSelectEvent}
        getLocalizedText={getLocalizedText}
        shellMarginTop={shellMarginTop}
      />
    );
  }

  const specRaw = getSpectrogramFromCache(spectrogramCache, chunk?.index);
  if (!specRaw) return null;

  const chunkStartSec = chunk?.index ?? 0;
  const chunkDurationSec =
    totalDurationSec > 0
      ? Math.min(windowSec, Math.max(0, totalDurationSec - chunkStartSec))
      : windowSec;
  const spec = trimSpectrogramToDuration(specRaw, chunkDurationSec);

  const xaiHeatmap = chunk?.predictions?.xai_heatmap ?? null;
  const displaySegmentIndex = segmentNumberFromStart(chunk?.index ?? 0, windowSec) - 1;
  const chunkXaiGenerating =
    xaiPending &&
    chunk?.predictions?.meets_confidence_threshold &&
    !(xaiHeatmap?.length);

  return (
    <SpectrogramView
      spectrogram={spec}
      chunkIndex={displaySegmentIndex}
      variant="chunk"
      dict={dict}
      lang={lang}
      xaiHeatmap={xaiHeatmap}
      xaiGenerating={chunkXaiGenerating}
    />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function buildReportPayload({
  isSummaryPage,
  summaryChunk,
  activeChunk,
  okChunks,
  filename,
  spectrogramCache,
  totalDurationSec,
}) {
  const modelName = okChunks?.[0]?.model_name ?? 'perch';
  const windowSec = modelWindowSec(modelName);
  const sourceName = filename !== '—' ? filename : 'unknown.wav';
  const durationSec =
    totalDurationSec > 0
      ? String(totalDurationSec)
      : String((okChunks?.length ?? 1) * windowSec);

  if (isSummaryPage && summaryChunk) {
    const durationNum = totalDurationSec > 0 ? totalDurationSec : 0;
    const stitched = concatSpectrogramsToAudioDuration(
      okChunks,
      spectrogramCache,
      durationNum,
      windowSec
    );
    const specs = collectSpectrogramsFromChunks(okChunks, spectrogramCache);
    return {
      data: {
        analysis_id: `summary_${Date.now()}`,
        predictions: summaryChunk.predictions,
        decision_support: summaryChunk.decision_support,
      },
      audioInfo: {
        name: sourceName,
        duration: durationSec,
        chunkIndex: okChunks?.[0]?.index ?? 0,
        validChunkCount: okChunks?.length ?? 0,
      },
      spectrogram: stitched,
      spectrogramVariant: 'summary',
      spectrogramSegmentCount: specs.length,
      isSummaryReport: true,
      reportSegmentTitle: { zh: '總覽', en: 'Summary' },
      pdfPageSlug: 'Summary',
    };
  }

  if (activeChunk && !activeChunk.error) {
    const segmentNum = segmentNumberFromStart(activeChunk.index ?? 0, windowSec);
    return {
      data: {
        analysis_id: activeChunk.analysis_id,
        predictions: activeChunk.predictions,
        decision_support: activeChunk.decision_support,
      },
      audioInfo: {
        name: sourceName,
        duration: String(windowSec),
        chunkIndex: activeChunk.index,
      },
      spectrogram: getSpectrogramFromCache(spectrogramCache, activeChunk.index),
      spectrogramVariant: 'chunk',
      isSummaryReport: false,
      reportSegmentTitle: {
        zh: `片段 ${segmentNum}`,
        en: `Segment ${segmentNum}`,
      },
      pdfPageSlug: `Segment${String(segmentNum).padStart(2, '0')}`,
    };
  }

  return null;
}
