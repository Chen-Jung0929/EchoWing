import { toDatetimeLocalValue } from './downloadMetadata';

const LOCATION_STORAGE_KEY = 'echowing_survey_location';

/** @typedef {{ fieldConfirmation: string, segmentNotes: string }} SegmentNotes */

/**
 * @typedef {{
 *   overview: {
 *     observedAt: string;
 *     location: string;
 *     coordinates: { latitude: number; longitude: number } | null;
 *     observerName: string;
 *     environmentDescription: string;
 *     overallConclusion: string;
 *   };
 *   segments: Record<number, SegmentNotes>;
 * }} SurveyMetadata
 */

export function readStoredLocation() {
  try {
    return localStorage.getItem(LOCATION_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function writeStoredLocation(location) {
  try {
    const trimmed = location?.trim();
    if (trimmed) localStorage.setItem(LOCATION_STORAGE_KEY, trimmed);
  } catch {
    // ignore quota / private mode
  }
}

/**
 * @param {number[]} chunkIndices
 * @param {{ observerName?: string, location?: string }} [overviewDefaults]
 */
export function createEmptySurveyMetadata(chunkIndices = [], overviewDefaults = {}) {
  const segments = {};
  for (const idx of chunkIndices) {
    segments[idx] = { fieldConfirmation: '', segmentNotes: '' };
  }
  return {
    overview: {
      observedAt: toDatetimeLocalValue(),
      location: overviewDefaults.location ?? readStoredLocation(),
      coordinates: null,
      observerName: overviewDefaults.observerName ?? '',
      environmentDescription: '',
      overallConclusion: '',
    },
    segments,
  };
}

function applyOverviewDefaults(overview, defaults = {}) {
  const next = { ...overview };
  if (!next.observerName?.trim() && defaults.observerName) {
    next.observerName = defaults.observerName;
  }
  if (!next.location?.trim() && defaults.location) {
    next.location = defaults.location;
  }
  return next;
}

/** 合併舊版扁平結構（若存在） */
export function normalizeSurveyMetadata(raw, chunkIndices = [], overviewDefaults = {}) {
  const storedLocation = overviewDefaults.location ?? readStoredLocation();
  const defaults = {
    observerName: overviewDefaults.observerName ?? '',
    location: storedLocation,
  };

  if (!raw) return createEmptySurveyMetadata(chunkIndices, defaults);

  if (raw.overview && raw.segments) {
    const base = createEmptySurveyMetadata(chunkIndices, defaults);
    return {
      overview: applyOverviewDefaults({ ...base.overview, ...raw.overview }, defaults),
      segments: { ...base.segments, ...raw.segments },
    };
  }

  const base = createEmptySurveyMetadata(chunkIndices, defaults);
  return {
    overview: applyOverviewDefaults(
      {
        ...base.overview,
        observedAt: raw.observedAt ?? base.overview.observedAt,
        location: raw.location ?? base.overview.location,
        coordinates: raw.coordinates ?? null,
        observerName: raw.observerName ?? base.overview.observerName,
        environmentDescription: raw.environmentDescription ?? '',
        overallConclusion:
          raw.overallConclusion ??
          [raw.fieldConfirmation, raw.observerNotes].filter(Boolean).join('\n'),
      },
      defaults
    ),
    segments: base.segments,
  };
}

export function trimSurveyMetadata(metadata, defaults = {}) {
  const location = metadata.overview.location.trim();
  const observerName =
    metadata.overview.observerName.trim() || defaults.observerName?.trim() || '';

  if (location) writeStoredLocation(location);

  const overview = {
    observedAt: metadata.overview.observedAt,
    location,
    coordinates: metadata.overview.coordinates,
    observerName,
    environmentDescription: metadata.overview.environmentDescription.trim(),
    overallConclusion: metadata.overview.overallConclusion.trim(),
  };
  const segments = {};
  for (const [key, seg] of Object.entries(metadata.segments)) {
    segments[Number(key)] = {
      fieldConfirmation: seg.fieldConfirmation.trim(),
      segmentNotes: seg.segmentNotes.trim(),
    };
  }
  return { overview, segments };
}

export function isSurveyMetadataSaved(metadata) {
  return metadata != null;
}

export function fetchCurrentCoordinates() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      reject,
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    );
  });
}

export function formatCoordinatesLabel({ latitude, longitude }) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
