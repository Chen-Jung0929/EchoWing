/**
 * 與 backend/app/config.py `confidence_threshold` 預設值保持同步。
 * 執行時優先使用 API 回傳的 confidence_threshold（warmup / predict / stream init）。
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

/**
 * @param {unknown} value
 * @returns {number}
 */
export function resolveConfidenceThreshold(value) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0 && n <= 1) return n;
  return DEFAULT_CONFIDENCE_THRESHOLD;
}
