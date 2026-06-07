/** @typedef {{ zh: string, en: string }} LocalizedName */
/** @typedef {{ species_id: string, name: LocalizedName, probability: number, wiki_url_zh?: string | null, wiki_url_en?: string | null, scientific_name?: string }} TopSpecies */
/** @typedef {{ class_name: LocalizedName, probability: number }} TopClass */
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  resolveConfidenceThreshold,
} from '../config/confidenceThreshold';

export { DEFAULT_CONFIDENCE_THRESHOLD, resolveConfidenceThreshold };

/** @typedef {{ top_species?: TopSpecies[], top_classes?: TopClass[], attention_weights?: number[] }} Predictions */
/** @typedef {{ index: number, predictions?: Predictions, decision_support?: object, error?: string | null }} ChunkEntry */

const DISCLAIMER = {
  zh: '免責聲明：本網站之 AI 模組僅提供分析與行動建議，不作最後決定。本平台不保證辨識結果之絕對正確性，亦不構成預測承諾、最終決策或行為保證。',
  en: 'Disclaimer: The AI module provides analysis and decision-support suggestions only. It does not make final decisions or guarantee absolute correctness.',
};

/**
 * 投票聚合：僅統計各片段通過信心門檻的 top_species。
 * @param {ChunkEntry[]} chunks
 * @param {{ confidenceThreshold?: number, windowSec?: number, dict?: object }} [options]
 */
export function aggregateChunksByVote(chunks, options = {}) {
  const confidenceThreshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const windowSec = options.windowSec ?? modelWindowSec(chunks?.[0]?.model_name);
  const dict = options.dict;
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

  const attention_weights = validChunks.flatMap(
    (c) => c.predictions.attention_weights ?? []
  );

  return {
    validChunkCount: n,
    predictions: {
      top_species,
      top_classes: [],
      attention_weights: attention_weights.length > 0 ? attention_weights : null,
      meets_confidence_threshold: top_species.length > 0,
      reference_species: [],
    },
    decision_support: buildSummaryDecisionSupport(
      top_species,
      n,
      confidenceThreshold,
      windowSec,
      dict
    ),
  };
}

import { formatMessage } from '../i18n';

function buildSummaryDecisionSupport(
  topSpecies,
  validCount,
  threshold = DEFAULT_CONFIDENCE_THRESHOLD,
  windowSec = 5,
  dict = null
) {
  const thresholdPct = Math.round(threshold * 100);
  const fallbackDict = dict?.decisionSupport;

  if (!topSpecies.length) {
    return {
      risk_analysis: fallbackDict 
        ? formatMessage(fallbackDict.noReliableSummaryRisk, { threshold: thresholdPct })
        : {
            zh: `各片段皆未達 ${thresholdPct}% 信心門檻，無可靠物種辨識總覽。`,
            en: `No segment met the ${thresholdPct}% confidence threshold; no reliable species summary.`,
          },
      action_recommendation: fallbackDict
        ? fallbackDict.noReliableSummaryAction
        : {
            zh: '建議重新錄製含清晰鳥鳴的片段，或逐段查看低信心候選與決策輔助說明。',
            en: 'Re-record with clearer bird calls, or review each segment’s reference candidates and decision support.',
          },
      disclaimer: fallbackDict ? fallbackDict.disclaimer : DISCLAIMER,
    };
  }

  const top = topSpecies[0];
  const pct = Math.round(top.probability * 100);
  const votes = top.vote_count;
  const nameZh = top.name?.zh ?? top.species_id;
  const nameEn = top.name?.en ?? top.species_id;
  const name = dict ? (top.name?.[dict.htmlLang?.split('-')[0]] ?? nameEn) : nameEn;
  
  const chunkHint =
    top.chunk_indices?.length > 0
      ? top.chunk_indices
          .map((sec) => segmentNumberFromStart(sec, windowSec))
          .join(dict ? (dict.htmlLang?.startsWith('zh') ? '、' : ', ') : ', ')
      : '—';

  return {
    risk_analysis: fallbackDict
      ? formatMessage(fallbackDict.voteAggregateRisk, { name, votes, validCount, pct, chunkHint })
      : {
          zh: `投票彙整：${nameZh} 在 ${votes}/${validCount} 個分析窗的 Top 預測中出現（整體得票率 ${pct}%）。主要出現在窗 ${chunkHint}。`,
          en: `Vote aggregate: ${nameEn} appeared in the top predictions of ${votes}/${validCount} window(s) (overall vote share ${pct}%). Most prominent in window(s) ${chunkHint}.`,
        },
    action_recommendation: fallbackDict
      ? fallbackDict.useSummaryAction
      : {
          zh: '建議以總覽結果為整段錄音的參考；若各片段差異大，請點選時間軸查看分段詳情。',
          en: 'Use the summary as a reference for the full recording; if segments disagree, use the timeline to inspect each segment.',
        },
    disclaimer: fallbackDict ? fallbackDict.disclaimer : DISCLAIMER,
  };
}

/** @deprecated use modelWindowSec */
export const CHUNK_DURATION_SEC = 5;

/** Per-model analysis window length (seconds). */
export function modelWindowSec(modelName = 'perch') {
  if (modelName === 'birdnet') return 3;
  return 5;
}

/**
 * Human-readable non-overlapping window on the timeline.
 * @param {number} startSec - window start in seconds (chunk.index from API)
 * @param {number} [windowSec]
 */
export function chunkTimeRangeLabel(startSec, windowSec = CHUNK_DURATION_SEC) {
  const start = Math.max(0, Number(startSec) || 0);
  const end = start + windowSec;
  return `${start}–${end}s`;
}

/**
 * Keep non-overlapping windows only (0, 5, 10… or 0, 3, 6…), sorted by start time.
 * @param {ChunkEntry[]} chunks
 * @param {string} [modelName]
 */
export function displayChunksForModel(chunks, modelName) {
  const model = modelName ?? chunks?.[0]?.model_name ?? 'perch';
  const windowSec = modelWindowSec(model);
  const seen = new Set();
  const out = [];

  for (const chunk of chunks ?? []) {
    const start = chunk?.index ?? 0;
    const chunkModel = chunk?.model_name ?? model;
    if (chunkModel !== model) continue;
    if (!chunk.error && start % windowSec !== 0) continue;
    const key = start;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chunk);
  }

  return out.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

/** 1-based segment number for UI tabs (segment 1 = 0–5s when window is 5s). */
export function segmentNumberFromStart(startSec, windowSec = CHUNK_DURATION_SEC) {
  const start = Math.max(0, Number(startSec) || 0);
  return Math.floor(start / windowSec) + 1;
}
