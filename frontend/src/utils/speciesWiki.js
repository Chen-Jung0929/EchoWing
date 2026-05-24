/**
 * 依介面語言選擇維基連結；若僅有單一語言連結則兩種語言共用。
 * @param {{ wiki_url_zh?: string | null, wiki_url_en?: string | null }} species
 * @param {'zh' | 'en'} lang
 * @returns {string | null}
 */
export function resolveSpeciesWikiUrl(species, lang) {
  const zh = (species?.wiki_url_zh ?? '').trim();
  const en = (species?.wiki_url_en ?? '').trim();
  const preferred = lang === 'zh' ? zh || en : en || zh;
  return preferred || null;
}
