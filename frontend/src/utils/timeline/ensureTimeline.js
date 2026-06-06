import { buildTimelineModel } from './buildTimelineModel.js';
import { buildTimelineFromChunks } from './clientDeconv.js';

/**
 * Use backend timeline when present; otherwise derive from streamed chunks.
 * @param {object | null | undefined} predictionResult
 * @returns {object | null}
 */
export function ensureTimeline(predictionResult) {
  if (predictionResult?.timeline?.species?.length) {
    return predictionResult.timeline;
  }

  const payload = buildTimelineFromChunks(predictionResult?.chunks ?? [], {
    durationSec: predictionResult?.stream_meta?.total_duration_sec ?? 0,
    windowSec: predictionResult?.stream_meta?.window_sec ?? 5,
    strideSec: predictionResult?.stream_meta?.stride_sec ?? 1,
  });

  return payload ? buildTimelineModel(payload) : predictionResult?.timeline ?? null;
}
