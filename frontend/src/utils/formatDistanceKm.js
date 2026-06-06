/**
 * @param {number} km
 * @param {'zh'|'en'} lang
 */
export function formatDistanceKm(km, lang) {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return lang === 'zh' ? `${meters} 公尺` : `${meters} m`;
  }
  const rounded = Math.round(km * 10) / 10;
  return lang === 'zh' ? `${rounded} 公里` : `${rounded} km`;
}
