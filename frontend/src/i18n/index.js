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
import pt from './locales/pt.js';
import it from './locales/it.js';
import nl from './locales/nl.js';
import de from './locales/de.js';

import { LANGUAGE_OPTIONS, SUPPORTED_LANGS, DEFAULT_LANG, detectBrowserLanguage } from './languages.js';

/** @typedef {typeof zh} LocaleMessages */

const messages = { zh, en, nan, hak, lzh, yue, ja, ko, th, ms, id, hi, vi, fil, fr, es, pt, it, nl, de };

function pseudoLocalizeString(str) {
  const map = {
    'a': 'å', 'b': 'ƀ', 'c': 'ç', 'd': 'ď', 'e': 'è', 'f': 'ƒ', 'g': 'ğ', 'h': 'ħ', 'i': 'î', 'j': 'ĵ',
    'k': 'ķ', 'l': 'ļ', 'm': 'ṁ', 'n': 'ñ', 'o': 'õ', 'p': 'þ', 'q': 'q', 'r': 'ř', 's': 'š', 't': 'ţ',
    'u': 'û', 'v': 'ṽ', 'w': 'ŵ', 'x': 'x', 'y': 'ý', 'z': 'ž',
    'A': 'Å', 'B': 'Ɓ', 'C': 'Ç', 'D': 'Ď', 'E': 'È', 'F': 'Ƒ', 'G': 'Ğ', 'H': 'Ħ', 'I': 'Î', 'J': 'Ĵ',
    'K': 'Ķ', 'L': 'Ļ', 'M': 'Ṁ', 'N': 'Ñ', 'O': 'Õ', 'P': 'Þ', 'Q': 'Q', 'R': 'Ř', 'S': 'Š', 'T': 'Ţ',
    'U': 'Û', 'V': 'Ṽ', 'W': 'Ŵ', 'X': 'X', 'Y': 'Ý', 'Z': 'Ž'
  };
  const IGNORED = ['XAI', 'PDF', 'API', 'SSE', 'PCEN', 'Perch', 'BirdNET', 'SILIC', 'Threads', 'X', 'Facebook'];
  if (IGNORED.includes(str)) return str;
  
  const transformed = str.replace(/(?:\{[^}]+\})|([a-zA-Z])/g, (match, letter) => {
    if (!letter) return match;
    return map[letter] || letter;
  });
  
  return `[!! ${transformed} !!]`;
}

function createPseudoLocale(sourceObj) {
  if (typeof sourceObj === 'string') {
    return pseudoLocalizeString(sourceObj);
  }
  if (Array.isArray(sourceObj)) {
    return sourceObj.map(createPseudoLocale);
  }
  if (typeof sourceObj === 'object' && sourceObj !== null) {
    const res = {};
    for (const key in sourceObj) {
      res[key] = createPseudoLocale(sourceObj[key]);
    }
    return res;
  }
  return sourceObj;
}

if (import.meta.env && import.meta.env.DEV) {
  messages.pseudo = createPseudoLocale(messages.en);
}

function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : base;
  }

  if (
    base &&
    typeof base === 'object' &&
    !Array.isArray(base) &&
    override &&
    typeof override === 'object' &&
    !Array.isArray(override)
  ) {
    const out = { ...base };
    for (const key of Object.keys(override)) {
      out[key] = key in base ? deepMerge(base[key], override[key]) : override[key];
    }
    return out;
  }

  return override === undefined || override === null ? base : override;
}

/**
 * @param {string} lang
 * @returns {LocaleMessages}
 */
export function getDict(lang) {
  const selected = messages[lang] ?? messages.en;
  return deepMerge(messages.en, selected);
}

/**
 * Replace `{key}` placeholders in a template string.
 * @param {string} template
 * @param {Record<string, string | number>} [params]
 */
export function formatMessage(template, params = {}) {
  if (!template) return template;
  return Object.entries(params).reduce(
    (str, [key, value]) => str.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export { LANGUAGE_OPTIONS, SUPPORTED_LANGS, DEFAULT_LANG, detectBrowserLanguage };
export { zh, en, nan, hak, lzh, yue, ja, ko, th, ms, id, hi, vi, fil, fr, es, pt, it, nl, de };
