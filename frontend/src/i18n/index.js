import zh from './locales/zh.js';
import en from './locales/en.js';
import ja from './locales/ja.js';
import ko from './locales/ko.js';

/** @typedef {typeof zh} LocaleMessages */
/** @typedef {'zh' | 'en' | 'ja' | 'ko'} LangCode */

const messages = { zh, en, ja, ko };
export const SUPPORTED_LANGS = ['zh', 'en', 'ja', 'ko'];

export function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const code = String(navigator.languages?.[0] ?? navigator.language ?? 'en').toLowerCase();
  if (code.startsWith('zh')) return 'zh';
  if (code.startsWith('ja')) return 'ja';
  if (code.startsWith('ko')) return 'ko';
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

export { zh, en, ja, ko };
