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

function createSafeDict(dict, fallbackDict, path = '') {
  if (typeof Proxy === 'undefined') return dict;
  
  return new Proxy(dict, {
    get(target, prop) {
      if (typeof prop === 'symbol' || prop === '$$typeof' || prop === 'toJSON') {
        return target[prop];
      }
      
      let val = target[prop];
      let isMissing = !(prop in target) || val === undefined;
      
      if (isMissing) {
        const fullPath = path ? `${path}.${prop}` : prop;
        if (import.meta.env && import.meta.env.DEV) {
          console.warn(`[i18n] Missing key: ${fullPath}`);
          return `[missing: ${fullPath}]`;
        } else {
          console.warn(`[i18n] Missing key in production: ${fullPath}. Falling back to English.`);
          val = fallbackDict ? fallbackDict[prop] : undefined;
        }
      }
      
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return createSafeDict(val, fallbackDict?.[prop], path ? `${path}.${prop}` : prop);
      }
      
      if (Array.isArray(val)) {
         return val.map((v, i) => 
           (v && typeof v === 'object') ? createSafeDict(v, fallbackDict?.[prop]?.[i], `${path ? path + '.' : ''}${prop}[${i}]`) : v
         );
      }
      
      return val;
    }
  });
}

/**
 * @param {string} lang
 * @returns {LocaleMessages}
 */
export function getDict(lang) {
  const baseDict = messages[lang] || messages.en;
  return createSafeDict(baseDict, messages.en);
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
