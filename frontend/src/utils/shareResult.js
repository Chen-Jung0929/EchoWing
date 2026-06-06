import {
  buildTimelineSpeciesSummary,
  displayChunkForTime,
  timelineSelectionLabel,
} from './timeline/timelineNavigation';
import { formatMessage } from '../i18n';
import { getLocalizedText } from '../i18n/getLocalizedText';
import { getModelDisplayLabel } from './modelLabel';
import {
  collectSpectrogramsFromChunks,
  concatSpectrogramsToAudioDuration,
  getSpectrogramFromCache,
  trimSpectrogramToDuration,
} from './spectrogramCache';
import { filterEventsInTimeWindow } from './spectrogramWithLabels';
import {
  downloadShareImage,
  imageDataUrlToFile,
  renderShareImageCard,
} from './shareResultImage';

/**
 * @param {object} predictions
 * @param {string} lang
 * @param {import('../i18n').LocaleMessages} dict
 */
function extractSpecies(predictions, lang, dict) {
  if (!predictions) {
    return { items: [], text: dict.noSpeciesHint };
  }

  const meets = predictions.meets_confidence_threshold ?? (predictions.top_species?.length > 0);
  const list = meets ? predictions.top_species : predictions.reference_species;
  const items = (list ?? []).slice(0, 5).map((sp) => ({
    name: getLocalizedText(sp.name, lang),
    pct: Math.round((sp.probability ?? 0) * 100),
  }));

  const text =
    items.map((item) => `${item.name} ${item.pct}%`).join(', ') || dict.noSpeciesHint;

  return { items, text };
}

/**
 * @returns {{ spectrogram: object | null, durationSec: number, events: object[], timeOffsetSec: number }}
 */
export function resolveShareSpectrogramContext({
  selectedEvent,
  timeline,
  chunks,
  spectrogramCache,
  windowSec,
  totalDurationSec,
}) {
  const events = timeline?.species_events ?? [];

  if (!selectedEvent) {
    const durationSec =
      totalDurationSec > 0
        ? totalDurationSec
        : collectSpectrogramsFromChunks(chunks, spectrogramCache).length * windowSec;
    const spectrogram = concatSpectrogramsToAudioDuration(
      chunks,
      spectrogramCache,
      durationSec,
      windowSec
    );
    return { spectrogram, durationSec, events, timeOffsetSec: 0 };
  }

  const chunk = displayChunkForTime(chunks, selectedEvent.peakTime, windowSec);
  if (!chunk || chunk.error) {
    return { spectrogram: null, durationSec: 0, events: [], timeOffsetSec: 0 };
  }
  const spec = getSpectrogramFromCache(spectrogramCache, chunk.index);
  if (!spec) {
    return { spectrogram: null, durationSec: 0, events: [], timeOffsetSec: 0 };
  }
  const chunkStartSec = chunk.index ?? 0;
  const durationSec =
    totalDurationSec > 0
      ? Math.min(windowSec, Math.max(0, totalDurationSec - chunkStartSec))
      : windowSec;
  const spectrogram = trimSpectrogramToDuration(spec, durationSec);
  const segEvents = filterEventsInTimeWindow(
    events,
    chunkStartSec,
    chunkStartSec + windowSec - 1
  );
  return { spectrogram, durationSec, events: segEvents, timeOffsetSec: chunkStartSec };
}

/**
 * @param {object} opts
 * @param {object | null} [opts.selectedEvent]
 * @param {object[]} opts.chunks
 * @param {Map<number, object> | Record<number, object>} opts.spectrogramCache
 * @param {number} opts.windowSec
 * @param {number} opts.totalDurationSec
 */
export function resolveShareSpectrogram({
  selectedEvent,
  chunks,
  spectrogramCache,
  windowSec,
  totalDurationSec,
}) {
  return resolveShareSpectrogramContext({
    selectedEvent,
    timeline: null,
    chunks,
    spectrogramCache,
    windowSec,
    totalDurationSec,
  }).spectrogram;
}

/**
 * @param {object} opts
 * @param {object | null} [opts.selectedEvent]
 * @param {object | null} [opts.timeline]
 * @param {object | null} [opts.summary]
 * @param {object[]} opts.chunks
 * @param {string} opts.filename
 * @param {string} opts.lang
 * @param {import('../i18n').LocaleMessages} opts.dict
 * @param {number} opts.windowSec
 * @param {(name: object, lang: string) => string} opts.getLocalizedText
 * @param {string} [opts.processedAt]
 * @param {Map<number, object> | Record<number, object>} [opts.spectrogramCache]
 * @param {number} [opts.totalDurationSec]
 * @param {string} [opts.modelName]
 */
export function buildResultShareContent({
  selectedEvent,
  timeline,
  summary,
  chunks,
  filename,
  lang,
  dict,
  windowSec,
  getLocalizedText,
  processedAt,
  spectrogramCache,
  totalDurationSec = 0,
  modelName = 'perch',
}) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const title = `${dict.title} · ${dict.resultTitle}`;
  const modelLabel = getModelDisplayLabel(modelName, dict);

  const tabLabel = timelineSelectionLabel(
    selectedEvent,
    windowSec,
    dict,
    getLocalizedText,
    lang
  );

  let speciesItems;
  let speciesText;
  let contextLine = '';

  if (selectedEvent) {
    const chunk = displayChunkForTime(chunks, selectedEvent.peakTime, windowSec);
    if (chunk?.error) {
      speciesItems = [];
      speciesText = dict.decodeFailed;
    } else {
      const extracted = extractSpecies(chunk?.predictions, lang, dict);
      speciesItems = extracted.items;
      speciesText = extracted.text;
    }
    contextLine = formatMessage(dict.shareEventLine, {
      species: getLocalizedText(selectedEvent.name, lang),
      peak: selectedEvent.peakTime,
      confidence: Math.round((selectedEvent.confidence ?? 0) * 100),
    });
  } else {
    const timelineSpecies = buildTimelineSpeciesSummary(timeline);
    const predictions =
      timelineSpecies.length > 0
        ? { top_species: timelineSpecies, meets_confidence_threshold: true }
        : summary?.predictions;
    const extracted = extractSpecies(predictions, lang, dict);
    speciesItems = extracted.items;
    speciesText = extracted.text;
    if (speciesItems[0] && timeline?.species_events?.length) {
      contextLine = formatMessage(dict.shareTimelineLine, {
        species: speciesItems[0].name,
        events: timeline.species_events.length,
      });
    }
  }

  const speciesLines = speciesItems
    .map((item, index) => `${index + 1}. ${item.name} — ${item.pct}%`)
    .join('\n');

  const templates = {
    social: formatMessage(dict.shareTemplateSocial, {
      topSpecies: speciesItems[0]?.name ?? dict.noSpeciesHint,
      confidence: speciesItems[0]?.pct ?? 0,
      tabLabel,
      modelLabel,
      url,
    }),
    detailed: [
      `${dict.title} — ${tabLabel}`,
      processedAt ? `${dict.analyzedAt}: ${processedAt}` : null,
      `${dict.modelUsed}: ${modelLabel}`,
      `${dict.sourceFile}: ${filename}`,
      contextLine || null,
      dict.topSpecies,
      speciesLines || speciesText,
      url,
    ]
      .filter(Boolean)
      .join('\n'),
  };

  const specContext = spectrogramCache
    ? resolveShareSpectrogramContext({
        selectedEvent,
        timeline,
        chunks,
        spectrogramCache,
        windowSec,
        totalDurationSec,
      })
    : { spectrogram: null, durationSec: 0, events: [], timeOffsetSec: 0 };

  const imageDataUrl = renderShareImageCard({
    title: dict.title,
    tabLabel,
    filename,
    modelLabel,
    speciesItems,
    url,
    dict,
    spectrogram: specContext.spectrogram,
    events: specContext.events,
    durationSec: specContext.durationSec,
    resolveName: (name) => getLocalizedText(name, lang),
    timeOffsetSec: specContext.timeOffsetSec,
  });

  return {
    title,
    text: templates.social,
    url,
    tabLabel,
    modelName,
    modelLabel,
    templates,
    speciesItems,
    imageDataUrl,
  };
}

/**
 * @param {'facebook' | 'twitter' | 'threads'} platform
 * @param {{ text: string, url: string }} payload
 */
export function openSocialShare(platform, payload) {
  const { text, url } = payload;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const urls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
    threads: `https://www.threads.net/intent/post?text=${encodedText}`,
  };

  const shareUrl = urls[platform];
  if (shareUrl) {
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=520');
  }
}

/**
 * @param {string} text
 */
export async function copyShareText(text) {
  await navigator.clipboard.writeText(text);
}

/**
 * @param {string} dataUrl
 * @returns {Promise<boolean>}
 */
export async function tryCopyImageToClipboard(dataUrl) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    return false;
  }
  try {
    const blob = await fetch(dataUrl).then((response) => response.blob());
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

/** @returns {boolean} */
export function isMobileShareDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPod|Mobile/i.test(ua) || (ua.includes('iPad') && navigator.maxTouchPoints > 1);
}

/**
 * 手機：以系統分享帶入圖片與文字。
 * @param {{ title: string, text: string, url: string, imageDataUrl?: string }} payload
 */
export async function publishNativeShare(payload) {
  if (payload.imageDataUrl) {
    const file = await imageDataUrlToFile(payload.imageDataUrl);
    const shareData = { title: payload.title, text: payload.text, files: [file] };

    if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      try {
        await navigator.share(shareData);
        return { ok: true, mode: 'native' };
      } catch (err) {
        if (err?.name === 'AbortError') return { ok: false, mode: 'cancelled' };
      }
    }
  } else if (navigator.share) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return { ok: true, mode: 'native' };
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, mode: 'cancelled' };
    }
  }

  return { ok: false, mode: 'unsupported' };
}

/**
 * 電腦：複製／下載資產並開啟各平台發佈頁。
 * @param {{ title: string, text: string, url: string, imageDataUrl?: string }} payload
 * @param {'facebook' | 'twitter' | 'threads'} platform
 */
export async function publishPlatformShare(payload, platform) {
  await copyShareText(payload.text);
  const imageCopied = payload.imageDataUrl
    ? await tryCopyImageToClipboard(payload.imageDataUrl)
    : false;

  if (payload.imageDataUrl && !imageCopied) {
    downloadShareImage(payload.imageDataUrl);
  }

  openSocialShare(platform, payload);

  return {
    ok: true,
    mode: 'fallback',
    textCopied: true,
    imageCopied,
    imageDownloaded: Boolean(payload.imageDataUrl && !imageCopied),
    platform,
  };
}
