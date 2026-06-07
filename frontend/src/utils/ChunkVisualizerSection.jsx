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

