import zh from './locales/zh.js';
import en from './locales/en.js';
import ja from './locales/ja.js';
import ko from './locales/ko.js';
import fr from './locales/fr.js';
import es from './locales/es.js';
import th from './locales/th.js';
import de from './locales/de.js';
import lzh from './locales/lzh.js';
import id from './locales/id.js';
import yue from './locales/yue.js';
import ms from './locales/ms.js';

/** @typedef {typeof zh} LocaleMessages */
/** @typedef {'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'es' | 'th' | 'de' | 'lzh' | 'id' | 'yue' | 'ms'} LangCode */

const messages = { zh, en, ja, ko, fr, es, th, de, lzh, id, yue, ms };
export const SUPPORTED_LANGS = Object.keys(messages);

export const LANG_OPTIONS = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'th', label: 'ไทย' },
  { code: 'de', label: 'Deutsch' },
  { code: 'lzh', label: '文言文' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'yue', label: '粵語' },
  { code: 'ms', label: 'Bahasa Melayu' },
];

export function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const code = String(navigator.languages?.[0] ?? navigator.language ?? 'en').toLowerCase();
  if (code.startsWith('yue') || code.startsWith('zh-hk') || code.startsWith('zh-mo')) return 'yue';
  if (code.startsWith('zh')) return 'zh';
  if (code.startsWith('ja')) return 'ja';
  if (code.startsWith('ko')) return 'ko';
  if (code.startsWith('fr')) return 'fr';
  if (code.startsWith('es')) return 'es';
  if (code.startsWith('th')) return 'th';
  if (code.startsWith('de')) return 'de';
  if (code.startsWith('id')) return 'id';
  if (code.startsWith('ms')) return 'ms';
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

export { zh, en, ja, ko, fr, es, th, de, lzh, id, yue, ms };
