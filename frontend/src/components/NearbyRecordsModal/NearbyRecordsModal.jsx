import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';
import { formatMessage } from '../../i18n';
import { queryNearbyRecords } from '../../services/surveySheet';
import { fetchCurrentCoordinates } from '../../utils/surveyMetadata';
import { formatDistanceKm } from '../../utils/formatDistanceKm';
import LocationMap, { RecordsOverviewMap } from '../LocationMap/LocationMap';

const RADIUS_OPTIONS = [1, 3, 5, 10];

const selectClass =
  'rounded-xl border border-[var(--c-text)]/15 bg-[var(--c-bg)]/80 px-3 py-2 text-sm font-bold text-[var(--c-text)] focus:border-[var(--c-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/25';

function formatObservedAt(value, lang) {
  if (!value?.trim()) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('../../i18n').LocaleMessages} props.dict
 * @param {'zh'|'en'} props.lang
 * @param {{ latitude: number, longitude: number } | null | undefined} props.initialCoordinates
 * @param {() => void} props.onClose
 */
export default function NearbyRecordsModal({
  open,
  dict,
  lang,
  initialCoordinates,
  onClose,
}) {
  const titleId = useId();
  const [radiusKm, setRadiusKm] = useState(5);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [records, setRecords] = useState([]);
  const [coords, setCoords] = useState(null);

  const loadRecords = useCallback(
    async (latitude, longitude, radius) => {
      setStatus('loading');
      setError('');
      try {
        const list = await queryNearbyRecords({
          latitude,
          longitude,
          radiusKm: radius,
          limit: 20,
        });
        setRecords(list);
        setStatus('done');
      } catch (err) {
        setRecords([]);
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    []
  );

  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setError('');
      setRecords([]);
      setCoords(null);
      setRadiusKm(5);
      return undefined;
    }

    let cancelled = false;

    async function resolveAndFetch() {
      setStatus('loading');
      setError('');

      let resolved = initialCoordinates;
      if (
        !resolved ||
        !Number.isFinite(resolved.latitude) ||
        !Number.isFinite(resolved.longitude)
      ) {
        try {
          resolved = await fetchCurrentCoordinates();
        } catch {
          resolved = null;
        }
      }

      if (cancelled) return;

      if (
        !resolved ||
        !Number.isFinite(resolved.latitude) ||
        !Number.isFinite(resolved.longitude)
      ) {
        setCoords(null);
        setStatus('no_location');
        return;
      }

      setCoords(resolved);
      await loadRecords(resolved.latitude, resolved.longitude, 5);
    }

    resolveAndFetch();

    return () => {
      cancelled = true;
    };
  }, [open, initialCoordinates, loadRecords]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleRadiusChange = (e) => {
    const next = Number(e.target.value);
    setRadiusKm(next);
    if (coords) {
      loadRecords(coords.latitude, coords.longitude, next);
    }
  };

  const recordMarkers = useMemo(
    () =>
      records
        .map((rec) => ({
          lat: parseFloat(rec.latitude),
          lng: parseFloat(rec.longitude),
          color: 'blue',
        }))
        .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)),
    [records]
  );

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--c-text)]/10 bg-[var(--c-card)] shadow-[0_16px_48px_rgb(0,0,0,0.22)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--c-text)]/8 px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-black text-[var(--c-text)]">
              {dict.nearbyRecordsTitle}
            </h2>
            <p className="mt-1 text-xs text-[var(--c-text)]/55">
              {dict.nearbyRecordsSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--c-text)]/70 transition-colors hover:bg-[var(--c-bg)]/80"
            aria-label={dict.saveModalCancel}
          >
            <MdClose className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-[var(--c-text)]/8 px-6 py-3">
            <label className="mb-1 block text-xs font-bold text-[var(--c-text)]/70">
              {dict.nearbyRecordsRadiusLabel}
            </label>
            <select
              value={radiusKm}
              onChange={handleRadiusChange}
              disabled={status === 'loading' || status === 'no_location'}
              className={selectClass}
            >
              {RADIUS_OPTIONS.map((km) => (
                <option key={km} value={km}>
                  {formatMessage(dict.nearbyRecordsRadiusOption, { km })}
                </option>
              ))}
            </select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {coords && status !== 'no_location' ? (
              <RecordsOverviewMap
                center={coords}
                markers={recordMarkers}
                alt={dict.locationMapTitle}
                height={200}
                className="mb-4"
                dict={dict}
              />
            ) : null}

            {status === 'loading' ? (
              <p className="text-center text-sm text-[var(--c-text)]/60 py-8" role="status">
                {dict.nearbyRecordsLoading}
              </p>
            ) : null}

            {status === 'no_location' ? (
              <p className="text-center text-sm font-bold text-amber-700 dark:text-amber-300 py-8">
                {dict.nearbyRecordsNoLocation}
              </p>
            ) : null}

            {status === 'error' ? (
              <p className="text-center text-sm font-bold text-red-500 py-8" role="alert">
                {dict.nearbyRecordsError}: {error}
              </p>
            ) : null}

            {status === 'done' && records.length === 0 ? (
              <p className="text-center text-sm text-[var(--c-text)]/60 py-8">
                {dict.nearbyRecordsEmpty}
              </p>
            ) : null}

            {status === 'done' && records.length > 0 ? (
              <ul className="space-y-3">
                {records.map((rec, idx) => {
                  const recLat = parseFloat(rec.latitude);
                  const recLng = parseFloat(rec.longitude);
                  const hasCoords = Number.isFinite(recLat) && Number.isFinite(recLng);
                  return (
                  <li
                    key={`${rec.observed_at}-${rec.latitude}-${idx}`}
                    className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/40 p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                      <span className="font-black text-[var(--c-primary)]">
                        {formatMessage(dict.nearbyRecordsDistance, {
                          distance: formatDistanceKm(rec.distance_km, lang),
                        })}
                      </span>
                      <span className="text-xs text-[var(--c-text)]/50">
                        {formatObservedAt(rec.observed_at, lang)}
                      </span>
                    </div>
                    <p className="font-bold text-[var(--c-text)] whitespace-pre-line">
                      {rec.predicted_species?.trim() || '—'}
                    </p>
                    <p className="mt-1 text-[var(--c-text)]/75">{rec.location?.trim() || '—'}</p>
                    {hasCoords ? (
                      <LocationMap
                        latitude={recLat}
                        longitude={recLng}
                        title={dict.locationMapTitle}
                        height={140}
                        className="mt-3"
                        dict={dict}
                      />
                    ) : null}
                    {rec.observer_name?.trim() ? (
                      <p className="mt-2 text-xs text-[var(--c-text)]/60">
                        {dict.observerName}: {rec.observer_name}
                      </p>
                    ) : null}
                    {rec.observer_comment?.trim() ? (
                      <p className="mt-1 text-xs text-[var(--c-text)]/55 line-clamp-3">
                        {rec.observer_comment}
                      </p>
                    ) : null}
                    {rec.model?.trim() ? (
                      <p className="mt-2 text-[10px] text-[var(--c-text)]/45">{rec.model}</p>
                    ) : null}
                  </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div className="flex justify-end border-t border-[var(--c-text)]/8 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[var(--c-primary)] px-5 py-2.5 text-sm font-black text-[var(--c-bg)] shadow-md transition-all hover:brightness-110"
            >
              {dict.saveModalCancel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
