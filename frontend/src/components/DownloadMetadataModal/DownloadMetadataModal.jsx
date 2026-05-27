import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdMyLocation } from 'react-icons/md';
import {
  createEmptySurveyMetadata,
  fetchCurrentCoordinates,
  formatCoordinatesLabel,
  normalizeSurveyMetadata,
  trimSurveyMetadata,
} from '../../utils/surveyMetadata';

const inputClass =
  'w-full rounded-xl border border-[var(--c-text)]/15 bg-[var(--c-bg)]/80 px-3 py-2.5 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text)]/40 focus:border-[var(--c-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/25';

const labelClass = 'mb-1 block text-sm font-bold text-[var(--c-text)]/85';

export default function DownloadMetadataModal({
  open,
  dict,
  chunkIndices = [],
  initialMetadata = null,
  confirmLabel,
  onClose,
  onConfirm,
}) {
  const titleId = useId();
  const [form, setForm] = useState(() => createEmptySurveyMetadata(chunkIndices));
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const chunkKey = useMemo(() => chunkIndices.join(','), [chunkIndices]);
  const defaultObserver = dict.defaultObserverName;
  const initialMetadataRef = useRef(initialMetadata);
  initialMetadataRef.current = initialMetadata;
  const wasOpenRef = useRef(false);

  const applyGeolocationToForm = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(dict.locationUnsupported);
      return;
    }
    setLocationError('');
    setLocating(true);
    fetchCurrentCoordinates()
      .then(({ latitude, longitude }) => {
        setForm((prev) => ({
          ...prev,
          overview: {
            ...prev.overview,
            coordinates: { latitude, longitude },
            location: formatCoordinatesLabel({ latitude, longitude }),
          },
        }));
      })
      .catch(() => {
        setLocationError(dict.locationError);
      })
      .finally(() => setLocating(false));
  }, [dict.locationUnsupported, dict.locationError]);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return undefined;
    }

    if (wasOpenRef.current) return undefined;
    wasOpenRef.current = true;

    const overviewDefaults = {
      observerName: defaultObserver,
      location: undefined,
    };
    setForm(
      normalizeSurveyMetadata(initialMetadataRef.current, chunkIndices, overviewDefaults)
    );
    setLocationError('');

    const savedLocation = initialMetadataRef.current?.overview?.location?.trim();
    if (savedLocation) {
      setLocating(false);
      return undefined;
    }

    if (!navigator.geolocation) {
      setLocationError(dict.locationUnsupported);
      return undefined;
    }

    let cancelled = false;
    setLocating(true);
    fetchCurrentCoordinates()
      .then(({ latitude, longitude }) => {
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          overview: {
            ...prev.overview,
            coordinates: { latitude, longitude },
            location: formatCoordinatesLabel({ latitude, longitude }),
          },
        }));
      })
      .catch(() => {
        if (!cancelled) setLocationError(dict.locationError);
      })
      .finally(() => {
        if (!cancelled) setLocating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    chunkKey,
    chunkIndices,
    defaultObserver,
    dict.locationUnsupported,
    dict.locationError,
  ]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const setOverview = (key, value) => {
    setForm((prev) => ({
      ...prev,
      overview: { ...prev.overview, [key]: value },
    }));
  };

  const setSegment = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      segments: {
        ...prev.segments,
        [index]: { ...prev.segments[index], [key]: value },
      },
    }));
  };

  const handleUseCurrentLocation = () => {
    applyGeolocationToForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(
      trimSurveyMetadata(form, { observerName: dict.defaultObserverName })
    );
  };

  const sortedIndices = [...chunkIndices].sort((a, b) => a - b);

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
        className="relative z-10 flex max-h-[min(92vh,800px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--c-text)]/10 bg-[var(--c-card)] shadow-[0_16px_48px_rgb(0,0,0,0.22)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--c-text)]/8 px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-black text-[var(--c-text)]">
              {dict.saveModalTitle}
            </h2>
            <p className="mt-1 text-xs text-[var(--c-text)]/55">{dict.saveModalHint}</p>
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
            <fieldset className="space-y-3 border-0 p-0">
              <legend className="text-sm font-black text-[var(--c-primary)]">
                {dict.overviewNotesTitle}
              </legend>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="dm-observed-at">
                    {dict.observedAt}
                  </label>
                  <input
                    id="dm-observed-at"
                    type="datetime-local"
                    value={form.overview.observedAt}
                    onChange={(e) => setOverview('observedAt', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="dm-location">
                    {dict.location}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="dm-location"
                      type="text"
                      value={form.overview.location}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          overview: {
                            ...prev.overview,
                            location: e.target.value,
                            coordinates: null,
                          },
                        }));
                      }}
                      placeholder={dict.locationPlaceholder}
                      className={`${inputClass} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={locating}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[var(--c-primary)]/40 px-3 py-2 text-xs font-bold text-[var(--c-primary)] transition-colors hover:bg-[var(--c-primary)]/10 disabled:opacity-50"
                      title={dict.useCurrentLocation}
                    >
                      <MdMyLocation className="h-4 w-4" aria-hidden />
                      <span className="hidden sm:inline">{dict.useCurrentLocation}</span>
                    </button>
                  </div>
                  {locationError ? (
                    <p className="mt-1 text-xs font-bold text-red-500" role="alert">
                      {locationError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={labelClass} htmlFor="dm-observer">
                    {dict.observerName}
                  </label>
                  <input
                    id="dm-observer"
                    type="text"
                    value={form.overview.observerName}
                    onChange={(e) => setOverview('observerName', e.target.value)}
                    placeholder={dict.observerNamePlaceholder}
                    className={inputClass}
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="dm-env">
                    {dict.environmentDescription}
                  </label>
                  <textarea
                    id="dm-env"
                    rows={2}
                    value={form.overview.environmentDescription}
                    onChange={(e) => setOverview('environmentDescription', e.target.value)}
                    placeholder={dict.environmentDescriptionPlaceholder}
                    className={`${inputClass} resize-y min-h-[3.5rem]`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="dm-conclusion">
                    {dict.overallConclusion}
                  </label>
                  <textarea
                    id="dm-conclusion"
                    rows={2}
                    value={form.overview.overallConclusion}
                    onChange={(e) => setOverview('overallConclusion', e.target.value)}
                    placeholder={dict.overallConclusionPlaceholder}
                    className={`${inputClass} resize-y min-h-[3.5rem]`}
                  />
                </div>
              </div>
            </fieldset>

            {sortedIndices.length > 0 ? (
              <fieldset className="space-y-3 border-0 border-t border-[var(--c-text)]/8 p-0 pt-4">
                <legend className="text-sm font-black text-[var(--c-primary)]">
                  {dict.segmentNotesTitle}
                </legend>
                <div className="space-y-4">
                  {sortedIndices.map((idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/40 p-3"
                    >
                      <p className="mb-2 text-xs font-black text-[var(--c-text)]/70">
                        {dict.chunkLabel} {idx + 1}
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelClass} htmlFor={`dm-seg-conf-${idx}`}>
                            {dict.fieldConfirmation}
                          </label>
                          <textarea
                            id={`dm-seg-conf-${idx}`}
                            rows={2}
                            value={form.segments[idx]?.fieldConfirmation ?? ''}
                            onChange={(e) =>
                              setSegment(idx, 'fieldConfirmation', e.target.value)
                            }
                            placeholder={dict.fieldConfirmationPlaceholder}
                            className={`${inputClass} resize-y min-h-[3rem]`}
                          />
                        </div>
                        <div>
                          <label className={labelClass} htmlFor={`dm-seg-notes-${idx}`}>
                            {dict.segmentNotes}
                          </label>
                          <textarea
                            id={`dm-seg-notes-${idx}`}
                            rows={2}
                            value={form.segments[idx]?.segmentNotes ?? ''}
                            onChange={(e) => setSegment(idx, 'segmentNotes', e.target.value)}
                            placeholder={dict.segmentNotesPlaceholder}
                            className={`${inputClass} resize-y min-h-[3rem]`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--c-text)]/8 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--c-text)]/70 transition-colors hover:bg-[var(--c-bg)]/80"
            >
              {dict.saveModalCancel}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[var(--c-primary)] px-5 py-2.5 text-sm font-black text-[var(--c-bg)] shadow-md transition-all hover:brightness-110"
            >
              {confirmLabel ?? dict.saveModalConfirm}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
