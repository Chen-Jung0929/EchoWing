export const LANGUAGE_OPTIONS = [
  { code: 'zh', label: '中文', htmlLang: 'zh-TW', complete: true },
  { code: 'en', label: 'English', htmlLang: 'en', complete: true },
  { code: 'nan', label: '台語', htmlLang: 'nan-TW', complete: true },
  { code: 'hak', label: '客語', htmlLang: 'hak-TW', complete: true },
  { code: 'lzh', label: '文言文', htmlLang: 'lzh', complete: true },
  { code: 'yue', label: '粵語', htmlLang: 'yue-Hant', complete: true },
  { code: 'ja', label: '日本語', htmlLang: 'ja', complete: true },
  { code: 'ko', label: '한국어', htmlLang: 'ko', complete: true },
  { code: 'th', label: 'ไทย', htmlLang: 'th', complete: true },
  { code: 'ms', label: 'Bahasa Melayu', htmlLang: 'ms', complete: true },
  { code: 'id', label: 'Bahasa Indonesia', htmlLang: 'id', complete: true },
  { code: 'hi', label: 'हिन्दी', htmlLang: 'hi', complete: true },
  { code: 'vi', label: 'Tiếng Việt', htmlLang: 'vi', complete: true },
  { code: 'fil', label: 'Filipino', htmlLang: 'fil', complete: true },
  { code: 'fr', label: 'Français', htmlLang: 'fr', complete: true },
  { code: 'es', label: 'Español', htmlLang: 'es', complete: true },
  { code: 'pt', label: 'Português', htmlLang: 'pt', complete: true },
  { code: 'it', label: 'Italiano', htmlLang: 'it', complete: true },
  { code: 'nl', label: 'Nederlands', htmlLang: 'nl', complete: true },
  { code: 'de', label: 'Deutsch', htmlLang: 'de', complete: true }
];

if (import.meta.env && import.meta.env.DEV) {
  LANGUAGE_OPTIONS.push({ code: 'pseudo', label: 'Pseudo', htmlLang: 'en-XA', complete: true });
}

export const SUPPORTED_LANGS = LANGUAGE_OPTIONS.map(opt => opt.code);
export const DEFAULT_LANG = 'en';

export function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return DEFAULT_LANG;
  const code = String(navigator.languages?.[0] ?? navigator.language ?? DEFAULT_LANG).toLowerCase();
  
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
  if (code.startsWith('fil')) return 'fil';
  if (code.startsWith('fr')) return 'fr';
  if (code.startsWith('es')) return 'es';
  if (code.startsWith('pt')) return 'pt';
  if (code.startsWith('it')) return 'it';
  if (code.startsWith('nl')) return 'nl';
  if (code.startsWith('de')) return 'de';
  
  return DEFAULT_LANG;
}
