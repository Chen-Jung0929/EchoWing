import {
  buildGoogleMapsExternalUrl,
  buildGoogleStaticMapUrl,
} from '../../config/googleMaps';

function MapFallback({ latitude, longitude, dict, height, className }) {
  const href = buildGoogleMapsExternalUrl(latitude, longitude);
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--c-text)]/20 bg-[var(--c-bg)]/50 px-4 text-center text-xs text-[var(--c-text)]/60 ${className}`}
      style={{ height }}
    >
      <p>{dict.googleMapsNotConfigured}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-[var(--c-primary)] underline"
      >
        {dict.googleMapsOpenExternal}
      </a>
    </div>
  );
}

/**
 * @param {{ latitude: number, longitude: number, className?: string, height?: number, title?: string, dict: import('../../i18n').LocaleMessages }} props
 */
export default function LocationMap({
  latitude,
  longitude,
  className = '',
  height = 200,
  title = 'Map',
  dict,
}) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const staticUrl = buildGoogleStaticMapUrl({
    center: { latitude, longitude },
    markers: [],
    width: 640,
    height: Math.min(640, Math.max(120, height)),
  });

  if (!staticUrl) {
    return (
      <MapFallback
        latitude={latitude}
        longitude={longitude}
        dict={dict}
        height={height}
        className={className}
      />
    );
  }

  const externalUrl = buildGoogleMapsExternalUrl(latitude, longitude);

  return (
    <a
      href={externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={dict.googleMapsOpenExternal}
      className={`block overflow-hidden rounded-xl border border-[var(--c-text)]/10 ${className}`}
      style={{ height }}
    >
      <img
        src={staticUrl}
        alt={title}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </a>
  );
}

/**
 * @param {{
 *   center: { latitude: number, longitude: number },
 *   markers?: { lat: number, lng: number, color?: string, label?: string }[],
 *   className?: string,
 *   height?: number,
 *   alt?: string,
 *   dict: import('../../i18n').LocaleMessages,
 * }} props
 */
export function RecordsOverviewMap({
  center,
  markers = [],
  className = '',
  height = 220,
  alt = 'Map',
  dict,
}) {
  if (!Number.isFinite(center?.latitude) || !Number.isFinite(center?.longitude)) {
    return null;
  }

  const staticUrl = buildGoogleStaticMapUrl({ center, markers });

  if (!staticUrl) {
    return (
      <MapFallback
        latitude={center.latitude}
        longitude={center.longitude}
        dict={dict}
        height={height}
        className={className}
      />
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/50 ${className}`}
    >
      <img
        src={staticUrl}
        alt={alt}
        className="w-full object-cover"
        style={{ height, maxHeight: height }}
        loading="lazy"
      />
    </div>
  );
}
