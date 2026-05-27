/**
 * Resolve API fields that may be a plain string or `{ zh, en }` object.
 * @param {unknown} value
 * @param {'zh' | 'en' | string} lang
 */
export function getLocalizedText(value, lang) {
  if (value == null) return '';

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return value[lang] ?? value.en ?? value.zh ?? '';
  }

  return String(value);
}
