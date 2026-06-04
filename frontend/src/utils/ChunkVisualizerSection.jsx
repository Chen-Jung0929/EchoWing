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
    
    // Build a continuous smooth heatmap over the entire 30s by averaging overlapping chunks
    let summaryHeatmap = null;
    if (resultChunks && resultChunks.length > 0) {
      const allHeatmaps = resultChunks
        .filter(c => c.predictions?.xai_heatmap)
        .sort((a, b) => a.index - b.index);
        
      if (allHeatmaps.length > 0) {
        // Assume 1 index = 1 second.
        // E.g., chunk at index 0 covers 0-5s. Heatmap has N bins for 5s.
        // We map each bin to a global time and accumulate.
        const binsPerChunk = allHeatmaps[0].predictions.xai_heatmap.length;
        const chunkDurationSec = 5; // Approx
        const binsPerSec = binsPerChunk / chunkDurationSec;
        
        const lastChunk = allHeatmaps[allHeatmaps.length - 1];
        const totalDurationSec = lastChunk.index + chunkDurationSec;
        const totalBins = Math.ceil(totalDurationSec * binsPerSec);
        
        const accum = new Float32Array(totalBins);
        const counts = new Uint16Array(totalBins);
        
        for (const chunk of allHeatmaps) {
          const hm = chunk.predictions.xai_heatmap;
          const startBin = Math.floor(chunk.index * binsPerSec);
          for (let i = 0; i < hm.length; i++) {
            const globalBin = startBin + i;
            if (globalBin < totalBins) {
              accum[globalBin] += hm[i];
              counts[globalBin] += 1;
            }
          }
        }
        
        const finalHeatmap = [];
        for (let i = 0; i < totalBins; i++) {
          finalHeatmap.push(counts[i] > 0 ? accum[i] / counts[i] : 0);
        }
        summaryHeatmap = finalHeatmap;
      }
    }

    return (
      <SpectrogramView
        spectrogram={stitched}
        variant="summary"
        segmentCount={specs.length}
        dict={dict}
        lang={lang}
        heatmap={summaryHeatmap}
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
      heatmap={chunk?.predictions?.xai_heatmap}
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
        validChunkCount: okChunks?.length ?? 0,
      },
      spectrogram: concatSpectrogramPayloads(specs),
      spectrogramVariant: 'summary',
      spectrogramSegmentCount: specs.length,
      isSummaryReport: true,
      reportSegmentTitle: { zh: '總覽', en: 'Summary' },
      pdfPageSlug: 'Summary',
    };
  }

  if (activeChunk && !activeChunk.error) {
    const segmentNum = activeChunk.index + 1;
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
