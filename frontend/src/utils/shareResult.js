import { chunkTimeRangeLabel, segmentNumberFromStart } from './aggregateByVote';
import { formatMessage } from '../i18n';
import { getLocalizedText } from '../i18n/getLocalizedText';
import {
  collectSpectrogramsFromChunks,
  concatSpectrogramPayloads,
  getSpectrogramFromCache,
  trimSpectrogramToDuration,
} from './spectrogramCache';
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
 * @param {object} opts
 * @param {number} opts.pageIndex
 * @param {object[]} opts.chunks
 * @param {Map<number, object> | Record<number, object>} opts.spectrogramCache
 * @param {number} opts.windowSec
 * @param {number} opts.totalDurationSec
 */
export function resolveShareSpectrogram({
  pageIndex,
  chunks,
  spectrogramCache,
  windowSec,
  totalDurationSec,
}) {
  if (pageIndex === 0) {
    const specs = collectSpectrogramsFromChunks(chunks, spectrogramCache);
    let stitched = concatSpectrogramPayloads(specs);
    if (!stitched) return null;
    const durationSec =
      totalDurationSec > 0 ? totalDurationSec : specs.length * windowSec;
    return trimSpectrogramToDuration(stitched, durationSec);
  }

  const chunk = chunks[pageIndex - 1];
  if (!chunk || chunk.error) return null;
  return getSpectrogramFromCache(spectrogramCache, chunk.index);
}

function buildTabLabel(pageIndex, chunk, windowSec, dict) {
  if (pageIndex === 0) return dict.summaryLabel;
  const segNum = segmentNumberFromStart(chunk?.index, windowSec);
  return `${dict.chunkLabel} ${segNum} · ${chunkTimeRangeLabel(chunk?.index, windowSec)}`;
}

/**
 * @param {object} opts
 * @param {number} opts.pageIndex
 * @param {object | null} opts.summary
 * @param {object[]} opts.chunks
 * @param {string} opts.filename
 * @param {string} opts.lang
 * @param {import('../i18n').LocaleMessages} opts.dict
 * @param {number} opts.windowSec
 * @param {string} [opts.processedAt]
 * @param {Map<number, object> | Record<number, object>} [opts.spectrogramCache]
 * @param {number} [opts.totalDurationSec]
 */
export function buildResultShareContent({
  pageIndex,
  summary,
  chunks,
  filename,
  lang,
  dict,
  windowSec,
  processedAt,
  spectrogramCache,
  totalDurationSec = 0,
}) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const title = `${dict.title} · ${dict.resultTitle}`;

  let tabLabel;
  let speciesItems;
  let speciesText;
  let voteLine = '';

  if (pageIndex === 0) {
    tabLabel = buildTabLabel(0, null, windowSec, dict);
    const extracted = extractSpecies(summary?.predictions, lang, dict);
    speciesItems = extracted.items;
    speciesText = extracted.text;

    const validCount = summary?.validChunkCount ?? 0;
    if (speciesItems[0] && validCount > 0) {
      const top = summary?.predictions?.top_species?.[0];
      const votes = top?.vote_count ?? 0;
      voteLine = formatMessage(dict.shareVoteLine, {
        species: speciesItems[0].name,
        votes,
        total: validCount,
      });
    }
  } else {
    const chunk = chunks[pageIndex - 1];
    tabLabel = buildTabLabel(pageIndex, chunk, windowSec, dict);
    if (chunk?.error) {
      speciesItems = [];
      speciesText = dict.decodeFailed;
    } else {
      const extracted = extractSpecies(chunk?.predictions, lang, dict);
      speciesItems = extracted.items;
      speciesText = extracted.text;
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
      url,
    }),
    detailed: [
      `${dict.title} — ${tabLabel}`,
      processedAt ? `${dict.analyzedAt}: ${processedAt}` : null,
      `${dict.sourceFile}: ${filename}`,
      voteLine || null,
      dict.topSpecies,
      speciesLines || speciesText,
      url,
    ]
      .filter(Boolean)
      .join('\n'),
  };

  const spectrogram = spectrogramCache
    ? resolveShareSpectrogram({
        pageIndex,
        chunks,
        spectrogramCache,
        windowSec,
        totalDurationSec,
      })
    : null;

  const imageDataUrl = renderShareImageCard({
    title: dict.title,
    tabLabel,
    filename,
    speciesItems,
    url,
    dict,
    spectrogram,
  });

  return {
    title,
    text: templates.social,
    url,
    tabLabel,
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
