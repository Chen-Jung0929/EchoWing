import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';
import { loadGoogleMapsScript, reverseGeocodeLabel } from '../../config/loadGoogleMaps';
import { formatCoordinatesLabel } from '../../utils/surveyMetadata';

const DEFAULT_CENTER = { latitude: 25.033964, longitude: 121.564468 };
const MAP_HEIGHT = 320;

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('../../i18n').LocaleMessages} props.dict
 * @param {{ latitude: number, longitude: number } | null | undefined} props.initialCoordinates
 * @param {(value: { latitude: number, longitude: number, location: string }) => void} props.onConfirm
 * @param {() => void} props.onClose
 */
export default function LocationPickerModal({
  open,
  dict,
  initialCoordinates,
  onConfirm,
  onClose,
}) {
  const titleId = useId();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStatus('idle');
        setError('');
        setPicked(null);
        setConfirming(false);
        mapRef.current = null;
        markerRef.current = null;
      }, 0);
      return () => clearTimeout(t);
    }

    let cancelled = false;

    async function initMap() {
      setStatus('loading');
      setError('');

      try {
        const maps = await loadGoogleMapsScript();
        if (cancelled || !mapContainerRef.current) return;

        const start = initialCoordinates ?? DEFAULT_CENTER;
        const center = {
          lat: start.latitude,
          lng: start.longitude,
        };

        const map = new maps.Map(mapContainerRef.current, {
          center,
          zoom: initialCoordinates ? 15 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const marker = new maps.Marker({
          map,
          position: center,
          draggable: true,
        });

        const syncPick = (lat, lng) => {
          setPicked({ latitude: lat, longitude: lng });
        };

        syncPick(center.lat, center.lng);

        map.addListener('click', (event) => {
          const lat = event.latLng?.lat();
          const lng = event.latLng?.lng();
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          marker.setPosition({ lat, lng });
          syncPick(lat, lng);
        });

        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (!pos) return;
          syncPick(pos.lat(), pos.lng());
        });

        mapRef.current = map;
        markerRef.current = marker;
        if (!cancelled) setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setStatus('error');
        }
      }
    }

    initMap();

    return () => {
      cancelled = true;
    };
  }, [open, initialCoordinates]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleConfirm = async () => {
    if (!picked || confirming) return;
    setConfirming(true);
    try {
      const location = await reverseGeocodeLabel(picked.latitude, picked.longitude);
      onConfirm({
        latitude: picked.latitude,
        longitude: picked.longitude,
        location,
      });
      onClose();
    } catch {
      onConfirm({
        ...picked,
        location: formatCoordinatesLabel(picked),
      });
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[310] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--c-text)]/10 bg-[var(--c-card)] shadow-[0_16px_48px_rgb(0,0,0,0.22)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--c-text)]/8 px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-black text-[var(--c-text)]">
              {dict.locationPickerTitle}
            </h2>
            <p className="mt-1 text-xs text-[var(--c-text)]/55">{dict.locationPickerHint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--c-text)]/70 hover:bg-[var(--c-bg)]/80"
            aria-label={dict.saveModalCancel}
          >
            <MdClose className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="px-6 py-4">
          {status === 'loading' ? (
            <p className="mb-3 text-sm text-[var(--c-text)]/60" role="status">
              {dict.locationPickerLoading}
            </p>
          ) : null}
          {status === 'error' ? (
            <p className="mb-3 text-sm font-bold text-red-500" role="alert">
              {dict.locationPickerError}: {error}
            </p>
          ) : null}

          <div
            ref={mapContainerRef}
            className="w-full overflow-hidden rounded-xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/40"
            style={{ height: MAP_HEIGHT }}
          />

          {picked ? (
            <p className="mt-3 text-xs text-[var(--c-text)]/60">
              {formatCoordinatesLabel(picked)}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--c-text)]/8 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--c-text)]/70 hover:bg-[var(--c-bg)]/80"
          >
            {dict.saveModalCancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!picked || status !== 'ready' || confirming}
            className="rounded-xl bg-[var(--c-primary)] px-5 py-2.5 text-sm font-black text-[var(--c-bg)] shadow-md transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {dict.locationPickerConfirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
