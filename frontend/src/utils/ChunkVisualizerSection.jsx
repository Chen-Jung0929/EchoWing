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
    
    // Build a continuous smooth heatmap over the entire 30s by averaging overlapping chunks for each model
    let heatmapsByModel = null;
    if (resultChunks && resultChunks.length > 0) {
      const allHeatmaps = resultChunks
        .filter(c => c.predictions?.xai_heatmap)
        .sort((a, b) => a.index - b.index);
        
      if (allHeatmaps.length > 0) {
        heatmapsByModel = {};
        const uniqueModels = [...new Set(allHeatmaps.map(c => c.model_name || 'perch'))];
        
        uniqueModels.forEach(modelName => {
          const modelChunks = allHeatmaps.filter(c => (c.model_name || 'perch') === modelName);
          if (modelChunks.length === 0) return;
          
          const binsPerChunk = modelChunks[0].predictions.xai_heatmap.length;
          const chunkDurationSec = modelName === 'birdnet' ? 3 : 5; // Approx for strides
          const binsPerSec = binsPerChunk / chunkDurationSec;
          
          const lastChunk = modelChunks[modelChunks.length - 1];
          const totalDurationSec = lastChunk.index + chunkDurationSec;
          const totalBins = Math.ceil(totalDurationSec * binsPerSec);
          
          const accum = new Float32Array(totalBins);
          const counts = new Uint16Array(totalBins);
          
          for (const c of modelChunks) {
            const hm = c.predictions.xai_heatmap;
            const startBin = Math.floor(c.index * binsPerSec);
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
          heatmapsByModel[modelName] = finalHeatmap;
        });
      }
    }

    return (
      <SpectrogramView
        spectrogram={stitched}
        variant="summary"
        segmentCount={specs.length}
        dict={dict}
        lang={lang}
        heatmapsByModel={heatmapsByModel}
      />
    );
  }

  const spec = getSpectrogramFromCache(spectrogramCache, chunk?.index);
  if (!spec) return null;

  const mName = chunk?.model_name || 'perch';
  const heatmapsByModel = chunk?.predictions?.xai_heatmap ? { [mName]: chunk.predictions.xai_heatmap } : null;

  return (
    <SpectrogramView
      spectrogram={spec}
      chunkIndex={chunk.index}
      variant="chunk"
      dict={dict}
      lang={lang}
      heatmapsByModel={heatmapsByModel}
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
