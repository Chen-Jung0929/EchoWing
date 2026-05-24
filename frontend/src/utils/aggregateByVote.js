/** @typedef {{ zh: string, en: string }} LocalizedName */
/** @typedef {{ species_id: string, name: LocalizedName, probability: number, wiki_url_zh?: string | null, wiki_url_en?: string | null, scientific_name?: string }} TopSpecies */
/** @typedef {{ class_name: LocalizedName, probability: number }} TopClass */
/** @typedef {{ top_species?: TopSpecies[], top_classes?: TopClass[], attention_weights?: number[] }} Predictions */
/** @typedef {{ index: number, predictions?: Predictions, decision_support?: object, error?: string | null }} ChunkEntry */

const DISCLAIMER = {
  zh: '免責聲明：本網站之 AI 模組僅提供分析與行動建議，不作最後決定。本平台不保證辨識結果之絕對正確性，亦不構成預測承諾、最終決策或行為保證。',
  en: 'Disclaimer: The AI module provides analysis and decision-support suggestions only. It does not make final decisions or guarantee absolute correctness.',
};

/**
 * 投票聚合：僅統計各片段通過信心門檻的 top_species / top_classes。
 * @param {ChunkEntry[]} chunks
 * @param {{ confidenceThreshold?: number }} [options]
 */
export function aggregateChunksByVote(chunks, options = {}) {
  const confidenceThreshold = options.confidenceThreshold ?? 0.8;
  const validChunks = (chunks ?? []).filter((c) => !c.error && c.predictions);
  if (validChunks.length === 0) return null;

  const n = validChunks.length;
  const speciesMap = new Map();

  for (const chunk of validChunks) {
    const seen = new Set();
    for (const sp of chunk.predictions.top_species ?? []) {
      if (seen.has(sp.species_id)) continue;
      seen.add(sp.species_id);

      let entry = speciesMap.get(sp.species_id);
      if (!entry) {
        entry = {
          species_id: sp.species_id,
          name: sp.name,
          scientific_name: sp.scientific_name,
          wiki_url_zh: sp.wiki_url_zh,
          wiki_url_en: sp.wiki_url_en,
          voteCount: 0,
          chunkIndices: [],
          maxProb: 0,
        };
        speciesMap.set(sp.species_id, entry);
      }
      entry.voteCount += 1;
      entry.chunkIndices.push(chunk.index);
      entry.maxProb = Math.max(entry.maxProb, sp.probability);
    }
  }

  const top_species = [...speciesMap.values()]
    .sort((a, b) => b.voteCount - a.voteCount || b.maxProb - a.maxProb)
    .map((e) => ({
      species_id: e.species_id,
      name: e.name,
      scientific_name: e.scientific_name,
      wiki_url_zh: e.wiki_url_zh,
      wiki_url_en: e.wiki_url_en,
      probability: e.voteCount / n,
      vote_count: e.voteCount,
      chunk_indices: [...e.chunkIndices].sort((a, b) => a - b),
    }));

  const classMap = new Map();
  for (const chunk of validChunks) {
    const seen = new Set();
    for (const item of chunk.predictions.top_classes ?? []) {
      const key = item.class_name?.zh ?? item.class_name?.en ?? JSON.stringify(item.class_name);
      if (seen.has(key)) continue;
      seen.add(key);

      let entry = classMap.get(key);
      if (!entry) {
        entry = {
          class_name: item.class_name,
          voteCount: 0,
          chunkIndices: [],
          maxProb: 0,
        };
        classMap.set(key, entry);
      }
      entry.voteCount += 1;
      entry.chunkIndices.push(chunk.index);
      entry.maxProb = Math.max(entry.maxProb, item.probability);
    }
  }

  const top_classes = [...classMap.values()]
    .sort((a, b) => b.voteCount - a.voteCount || b.maxProb - a.maxProb)
    .map((e) => ({
      class_name: e.class_name,
      probability: e.voteCount / n,
      vote_count: e.voteCount,
      chunk_indices: [...e.chunkIndices].sort((a, b) => a - b),
    }));

  const attention_weights = validChunks.flatMap(
    (c) => c.predictions.attention_weights ?? []
  );

  return {
    validChunkCount: n,
    predictions: {
      top_species,
      top_classes,
      attention_weights: attention_weights.length > 0 ? attention_weights : null,
      meets_confidence_threshold: top_species.length > 0,
      reference_species: [],
    },
    decision_support: buildSummaryDecisionSupport(
      top_species,
      n,
      confidenceThreshold
    ),
  };
}

function buildSummaryDecisionSupport(topSpecies, validCount, threshold = 0.8) {
  const thresholdPct = Math.round(threshold * 100);

  if (!topSpecies.length) {
    return {
      risk_analysis: {
        zh: `各片段皆未達 ${thresholdPct}% 信心門檻，無可靠物種辨識總覽。`,
        en: `No segment met the ${thresholdPct}% confidence threshold; no reliable species summary.`,
      },
      action_recommendation: {
        zh: '建議重新錄製含清晰鳥鳴的片段，或逐段查看低信心候選與決策輔助說明。',
        en: 'Re-record with clearer bird calls, or review each segment’s reference candidates and decision support.',
      },
      disclaimer: DISCLAIMER,
    };
  }

  const top = topSpecies[0];
  const pct = Math.round(top.probability * 100);
  const votes = top.vote_count;
  const nameZh = top.name?.zh ?? top.species_id;
  const nameEn = top.name?.en ?? top.species_id;
  const chunkHint =
    top.chunk_indices?.length > 0
      ? top.chunk_indices.map((i) => i + 1).join('、')
      : '—';

  return {
    risk_analysis: {
      zh: `投票彙整：${nameZh} 在 ${votes}/${validCount} 個片段的 Top 預測中出現（整體得票率 ${pct}%）。主要出現在片段 ${chunkHint}。`,
      en: `Vote aggregate: ${nameEn} appeared in the top predictions of ${votes}/${validCount} segment(s) (overall vote share ${pct}%). Most prominent in segment(s) ${chunkHint}.`,
    },
    action_recommendation: {
      zh: '建議以總覽結果為整段錄音的參考；若各片段差異大，請點選時間軸查看分段詳情。',
      en: 'Use the summary as a reference for the full recording; if segments disagree, use the timeline to inspect each segment.',
    },
    disclaimer: DISCLAIMER,
  };
}

export const CHUNK_DURATION_SEC = 5;

export function chunkTimeRangeLabel(chunkIndex) {
  const start = chunkIndex * CHUNK_DURATION_SEC;
  const end = (chunkIndex + 1) * CHUNK_DURATION_SEC;
  return `${start}–${end}s`;
}
