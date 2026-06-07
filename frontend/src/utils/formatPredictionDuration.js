import { getDict } from '../i18n';

/**
 * @param {number | null | undefined} ms
 * @param {'zh'|'en'} lang
 */
export function formatPredictionDuration(ms, lang = 'zh') {
  if (ms == null || ms < 0 || !Number.isFinite(ms)) return '—';
  const sec = ms / 1000;
  if (sec < 60) {
    const label = sec.toFixed(1);
    return getDict(lang).durationSeconds?.replace('{s}', label);
  }
  const minutes = Math.floor(sec / 60);
  const seconds = Math.round(sec % 60);
  return lang === 'zh'
    ? `${minutes} 分 ${seconds} 秒`
    : `${minutes}m ${seconds}s`;
}
