/**
 * 依介面語言選擇維基連結；若僅有單一語言連結則兩種語言共用。
 * @param {{ wiki_url_zh?: string | null, wiki_url_en?: string | null }} species
 * @param {'zh' | 'en'} lang
 * @returns {string | null}
 */
export function resolveSpeciesWikiUrl(species, lang) {
  const query = species?.scientific_name || species?.name?.en || species?.name?.zh || species?.species_id;
  if (!query) return null;
  return `https://www.inaturalist.org/search?q=${encodeURIComponent(query)}`;
}
