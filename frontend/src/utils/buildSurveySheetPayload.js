import {
  aggregateChunksByVote,
  modelWindowSec,
  resolveConfidenceThreshold,
} from './aggregateByVote';
import { getModelDisplayLabel, resolveResultModelName } from './modelLabel';
import { getLocalizedText } from '../i18n/getLocalizedText';

export const TOP_SPECIES_SHEET_LIMIT = 3;

/**
 * @param {import('./aggregateByVote.js').TopSpecies} sp
 * @param {'zh'|'en'} lang
 */
function formatSpeciesName(sp, lang) {
  const name = getLocalizedText(sp.name, lang);
  const sci = sp.scientific_name?.trim();
  return sci ? `${name} (${sci})` : name;
}

/**
 * Top 3 species, one per line (for spreadsheet cell).
 * @param {import('./aggregateByVote.js').TopSpecies[]} topSpecies
 * @param {'zh'|'en'} lang
 */
export function formatPredictedSpeciesForSheet(topSpecies, lang) {
  if (!topSpecies?.length) return '';
  return topSpecies
    .slice(0, TOP_SPECIES_SHEET_LIMIT)
    .map((sp) => formatSpeciesName(sp, lang))
    .join('\n');
}

/**
 * @param {object} params
 * @param {object} params.result
 * @param {import('./surveyMetadata.js').SurveyMetadata} params.surveyMetadata
 * @param {import('../i18n').LocaleMessages} params.dict
 * @param {'zh'|'en'} [params.lang='zh']
 */
export function buildSurveySheetPayload({ result, surveyMetadata, dict, lang = 'zh' }) {
  const modelName = resolveResultModelName(result);
  const windowSec = modelWindowSec(modelName);
  const chunks = result.chunks ?? [];
  const summary = aggregateChunksByVote(chunks, {
    confidenceThreshold: resolveConfidenceThreshold(result.confidence_threshold),
    windowSec,
    dict,
  });

  const overview = surveyMetadata.overview;
  const coords = overview.coordinates;
  const topSpecies = summary?.predictions?.top_species ?? [];

  return {
    schema_version: 'v3-8col',
    observed_at: overview.observedAt ?? '',
    location: overview.location ?? '',
    latitude:
      coords && Number.isFinite(coords.latitude) ? String(coords.latitude) : '',
    longitude:
      coords && Number.isFinite(coords.longitude) ? String(coords.longitude) : '',
    predicted_species: formatPredictedSpeciesForSheet(topSpecies, lang),
    observer_name: overview.observerName ?? '',
    observer_comment: overview.overallConclusion ?? '',
    model: getModelDisplayLabel(modelName, dict),
  };
}
