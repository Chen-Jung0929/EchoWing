import zh from './locales/zh.js';
import en from './locales/en.js';

/** @typedef {typeof zh} LocaleMessages */
/** @typedef {'zh' | 'en'} LangCode */

const messages = { zh, en };

/**
 * @param {LangCode | string} lang
 * @returns {LocaleMessages}
 */
export function getDict(lang) {
  return messages[lang] ?? messages.zh;
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

export { zh, en };
