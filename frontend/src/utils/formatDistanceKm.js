import { getDict } from '../i18n';

/**
 * @param {number} km
 * @param {'zh'|'en'} lang
 */
export function formatDistanceKm(km, lang) {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return getDict(lang).distanceMeters?.replace('{meters}', meters);
  }
  const rounded = Math.round(km * 10) / 10;
  return getDict(lang).distanceKm?.replace('{km}', rounded);
}
