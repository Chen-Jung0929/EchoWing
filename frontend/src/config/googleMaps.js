/**
 * Google Maps API key (Maps Embed + Static Maps).
 * Restrict key by HTTP referrer in Google Cloud Console.
 */
export function getGoogleMapsApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';
}

export function isGoogleMapsConfigured() {
  return getGoogleMapsApiKey().length > 0;
}

/**
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} [zoom=15]
 */
export function buildGoogleMapsEmbedUrl(latitude, longitude, zoom = 15) {
  const key = getGoogleMapsApiKey();
  if (!key) return null;
  const params = new URLSearchParams({
    key,
    q: `${latitude},${longitude}`,
    zoom: String(zoom),
  });
  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}

/**
 * @param {number} latitude
 * @param {number} longitude
 */
export function buildGoogleMapsExternalUrl(latitude, longitude) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * @param {{ lat: number, lng: number, color?: string, label?: string }} marker
 */
function googleMarkerSegment(marker) {
  const parts = [];
  if (marker.color) parts.push(`color:${marker.color}`);
  if (marker.label) parts.push(`label:${marker.label}`);
  parts.push(`${marker.lat},${marker.lng}`);
  return parts.join('|');
}

/**
 * @param {{
 *   center: { latitude: number, longitude: number },
 *   markers?: { lat: number, lng: number, color?: string, label?: string }[],
 *   width?: number,
 *   height?: number,
 * }} options
 */
export function buildGoogleStaticMapUrl({
  center,
  markers = [],
  width = 640,
  height = 280,
}) {
  const key = getGoogleMapsApiKey();
  if (!key || !Number.isFinite(center?.latitude) || !Number.isFinite(center?.longitude)) {
    return null;
  }

  const all = [
    { lat: center.latitude, lng: center.longitude, color: 'red', label: 'U' },
    ...markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)),
  ];

  const lats = all.map((m) => m.lat);
  const lngs = all.map((m) => m.lng);
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lngs) - Math.min(...lngs),
    0.008
  );
  const zoom =
    span > 0.08 ? 11 : span > 0.04 ? 12 : span > 0.015 ? 13 : span > 0.006 ? 14 : 15;

  const params = new URLSearchParams({
    key,
    center: `${center.latitude},${center.longitude}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: '2',
    maptype: 'roadmap',
  });

  for (const m of all) {
    params.append('markers', googleMarkerSegment(m));
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
