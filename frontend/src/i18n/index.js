import zh from './locales/zh.js';
import en from './locales/en.js';
import nan from './locales/nan.js';
import hak from './locales/hak.js';
import lzh from './locales/lzh.js';
import yue from './locales/yue.js';
import ja from './locales/ja.js';
import ko from './locales/ko.js';
import th from './locales/th.js';
import ms from './locales/ms.js';
import id from './locales/id.js';
import hi from './locales/hi.js';
import vi from './locales/vi.js';
import fil from './locales/fil.js';
import fr from './locales/fr.js';
import es from './locales/es.js';
import de from './locales/de.js';

/** @typedef {typeof zh} LocaleMessages */
/** @typedef {'zh' | 'en' | 'nan' | 'hak' | 'lzh' | 'yue' | 'ja' | 'ko' | 'th' | 'ms' | 'id' | 'hi' | 'vi' | 'fil' | 'fr' | 'es' | 'de'} LangCode */

const messages = { zh, en, nan, hak, lzh, yue, ja, ko, th, ms, id, hi, vi, fil, fr, es, de };
export const SUPPORTED_LANGS = Object.keys(messages);

export const LANG_OPTIONS = [
  { code: 'zh', label: '中文', htmlLang: 'zh-TW' },
  { code: 'en', label: 'English', htmlLang: 'en' },
  { code: 'nan', label: '台語', htmlLang: 'nan-TW' },
  { code: 'hak', label: '客語', htmlLang: 'hak-TW' },
  { code: 'lzh', label: '文言文', htmlLang: 'lzh' },
  { code: 'yue', label: '粵語', htmlLang: 'yue-Hant' },
  { code: 'ja', label: '日本語', htmlLang: 'ja' },
  { code: 'ko', label: '한국어', htmlLang: 'ko' },
  { code: 'th', label: 'ไทย', htmlLang: 'th' },
  { code: 'ms', label: 'Bahasa Melayu', htmlLang: 'ms' },
  { code: 'id', label: 'Bahasa Indonesia', htmlLang: 'id' },
  { code: 'hi', label: 'हिन्दी', htmlLang: 'hi' },
  { code: 'vi', label: 'Tiếng Việt', htmlLang: 'vi' },
  { code: 'fil', label: 'Filipino', htmlLang: 'fil' },
  { code: 'fr', label: 'Français', htmlLang: 'fr' },
  { code: 'es', label: 'Español', htmlLang: 'es' },
  { code: 'de', label: 'Deutsch', htmlLang: 'de' },
];

export function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const code = String(navigator.languages?.[0] ?? navigator.language ?? 'en').toLowerCase();
  if (code.startsWith('yue') || code.startsWith('zh-hk') || code.startsWith('zh-mo')) return 'yue';
  if (code.startsWith('zh')) return 'zh';
  if (code.startsWith('nan')) return 'nan';
  if (code.startsWith('hak')) return 'hak';
  if (code.startsWith('ja')) return 'ja';
  if (code.startsWith('ko')) return 'ko';
  if (code.startsWith('th')) return 'th';
  if (code.startsWith('ms')) return 'ms';
  if (code.startsWith('id')) return 'id';
  if (code.startsWith('hi')) return 'hi';
  if (code.startsWith('vi')) return 'vi';
  if (code.startsWith('fil') || code.startsWith('tl')) return 'fil';
  if (code.startsWith('fr')) return 'fr';
  if (code.startsWith('es')) return 'es';
  if (code.startsWith('de')) return 'de';
  return 'en';
}

/**
 * @param {LangCode | string} lang
 * @returns {LocaleMessages}
 */
export function getDict(lang) {
  return { ...messages.en, ...(messages[lang] ?? messages.en) };
}

/**
 * Replace `{key}` placeholders in a template string.
 * @param {string} template
 * @param {Record<string, string | number>} [params]
 */
export function formatMessage(template, params = {}) {
  return Object.entries(params).reduce(
    (str, [key, value]) => str.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export { zh, en, nan, hak, lzh, yue, ja, ko, th, ms, id, hi, vi, fil, fr, es, de };
