import { chunkTimeRangeLabel } from '../aggregateByVote';
import { buildTimelineSpeciesSummary } from './timelineNavigation';
import {
  MIN_BOUNDARY_EVENT_CONFIDENCE,
  MIN_EVENT_CONFIDENCE,
} from './eventConfidenceFilter';

const DISCLAIMER = {
  zh: '免責聲明：本網站之 AI 模組僅提供分析與行動建議，不作最後決定。本平台不保證辨識結果之絕對正確性，亦不構成預測承諾、最終決策或行為保證。',
  en: 'Disclaimer: The AI module provides analysis and decision-support suggestions only. It does not make final decisions or guarantee absolute correctness.',
};

/**
 * 依時間軸事件信心產生決策輔助（取代逐片段模型信心文案）。
 * @param {object | null} timeline
 * @param {{ selectedEvent?: object | null, windowSec?: number }} [options]
 */
export function buildTimelineDecisionSupport(timeline, options = {}) {
  const { selectedEvent = null, windowSec = 5 } = options;
  const events = timeline?.species_events ?? [];
  const speciesSummary = buildTimelineSpeciesSummary(timeline);
  const minPct = Math.round(MIN_EVENT_CONFIDENCE * 100);
  const boundaryPct = Math.round(MIN_BOUNDARY_EVENT_CONFIDENCE * 100);

  if (selectedEvent) {
    const pct = Math.round((selectedEvent.confidence ?? 0) * 100);
    const nameZh = selectedEvent.name?.zh ?? selectedEvent.species_id ?? '—';
    const nameEn = selectedEvent.name?.en ?? selectedEvent.species_id ?? '—';
    const isBoundary =
      Boolean(selectedEvent.boundaryFlags?.onsetLow) ||
      Boolean(selectedEvent.boundaryFlags?.offsetLow);
    const rangeStart = Math.floor((selectedEvent.peakTime ?? 0) / windowSec) * windowSec;
    const timeRange = chunkTimeRangeLabel(rangeStart, windowSec);

    return {
      risk_analysis: {
        zh: isBoundary
          ? `於 ${selectedEvent.peakTime}s 偵測到 ${nameZh}（事件信心 ${pct}%）。此事件接近錄音邊界，反卷積覆蓋率可能較低，解讀時請謹慎。`
          : `於 ${selectedEvent.peakTime}s 偵測到 ${nameZh}，事件信心 ${pct}%（一般事件門檻 ${minPct}%）。此數值由反卷積活動與時間覆蓋率綜合估算。`,
        en: isBoundary
          ? `${nameEn} detected at ${selectedEvent.peakTime}s (event confidence ${pct}%). This event is near the recording boundary; deconvolution coverage may be lower—interpret with caution.`
          : `${nameEn} detected at ${selectedEvent.peakTime}s with ${pct}% event confidence (general threshold ${minPct}%). This score combines deconvolved activity and temporal coverage.`,
      },
      action_recommendation: {
        zh: `此事件落在 ${timeRange} 分析窗。建議對照頻譜圖與 XAI 時間重要性，並以實地觀察或影像作二次確認。`,
        en: `This event falls in analysis window ${timeRange}. Cross-check the spectrogram and XAI time importance; confirm with field observation or visual evidence when possible.`,
      },
      disclaimer: DISCLAIMER,
    };
  }

  if (!speciesSummary.length || !events.length) {
    return {
      risk_analysis: {
        zh: `時間軸未偵測到達事件信心門檻（一般事件 ≥${minPct}%、邊界 ≥${boundaryPct}%）的明顯鳴叫事件。`,
        en: `The timeline shows no clear vocalization events above the event-confidence thresholds (general ≥${minPct}%, boundary ≥${boundaryPct}%).`,
      },
      action_recommendation: {
        zh: '建議對照全段頻譜與原始音訊；若預期有鳥鳴，可嘗試在較安靜環境重新錄製或延長錄音時間。',
        en: 'Review the full spectrogram and original audio. If bird calls were expected, try re-recording in a quieter setting or using a longer clip.',
      },
      disclaimer: DISCLAIMER,
    };
  }

  const top = speciesSummary[0];
  const pct = Math.round((top.probability ?? 0) * 100);
  const nameZh = top.name?.zh ?? top.species_id ?? '—';
  const nameEn = top.name?.en ?? top.species_id ?? '—';
  const speciesCount = new Set(events.map((ev) => ev.species_id)).size;
  const peakTime = top.peak_time != null ? `${top.peak_time}s` : '—';

  return {
    risk_analysis: {
      zh: `時間軸偵測到 ${events.length} 個物種事件、${speciesCount} 種鳥類；最高事件信心為 ${nameZh}（${pct}%，峰值 ${peakTime}）。結果依反卷積時間軸與事件信心篩選，非逐窗投票聚合。`,
      en: `Timeline detected ${events.length} species event(s) across ${speciesCount} species; highest event confidence is ${nameEn} (${pct}%, peak ${peakTime}). Based on deconvolved timeline filtering, not per-window vote aggregation.`,
    },
    action_recommendation: {
      zh: '建議以時間軸事件作為整段錄音的參考摘要；點選事件可檢視該時段物種與頻譜。若用於生態調查，請輔以實地觀察或影像確認。',
      en: 'Use timeline events as a summary reference for the full recording; select an event to inspect that time window. For ecological surveys, confirm with field observation or visual evidence.',
    },
    disclaimer: DISCLAIMER,
  };
}
