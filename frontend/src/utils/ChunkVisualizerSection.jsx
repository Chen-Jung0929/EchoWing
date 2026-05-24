import SpectrogramView from '../components/Visualizer/SpectrogramView';
import {
  collectSpectrogramsFromChunks,
  concatSpectrogramPayloads,
  getSpectrogramFromCache,
} from './spectrogramCache';

export default function ChunkVisualizerSection({
  chunk,
  isSummary,
  resultChunks,
  spectrogramCache,
  dict,
  lang,
}) {
  if (isSummary) {
    const specs = collectSpectrogramsFromChunks(resultChunks, spectrogramCache);
    const stitched = concatSpectrogramPayloads(specs);
    if (!stitched) return null;

    return (
      <SpectrogramView
        spectrogram={stitched}
        variant="summary"
        segmentCount={specs.length}
        dict={dict}
        lang={lang}
      />
    );
  }

  const spec = getSpectrogramFromCache(spectrogramCache, chunk?.index);
  if (!spec) return null;

  return (
    <SpectrogramView
      spectrogram={spec}
      chunkIndex={chunk.index}
      variant="chunk"
      dict={dict}
      lang={lang}
    />
  );
}

export function buildReportPayload({
  isSummaryPage,
  summaryChunk,
  activeChunk,
  okChunks,
  filename,
  spectrogramCache,
}) {
  const sourceName = filename !== '—' ? filename : 'unknown.wav';
  const durationSec = String((okChunks?.length ?? 1) * 5);

  if (isSummaryPage && summaryChunk) {
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
      },
      spectrogram: concatSpectrogramPayloads(specs),
      spectrogramVariant: 'summary',
      spectrogramSegmentCount: specs.length,
    };
  }

  if (activeChunk && !activeChunk.error) {
    return {
      data: {
        analysis_id: activeChunk.analysis_id,
        predictions: activeChunk.predictions,
        decision_support: activeChunk.decision_support,
      },
      audioInfo: {
        name: sourceName,
        duration: '5.0',
        chunkIndex: activeChunk.index,
      },
      spectrogram: getSpectrogramFromCache(spectrogramCache, activeChunk.index),
      spectrogramVariant: 'chunk',
    };
  }

  return null;
}
