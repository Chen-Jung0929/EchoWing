/**
 * @param {string | undefined | null} modelName
 * @returns {'perch' | 'birdnet' | 'silic'}
 */
export function normalizeModelName(modelName) {
  const key = String(modelName ?? 'perch').toLowerCase();
  if (key === 'birdnet' || key === 'silic' || key === 'perch') return key;
  return 'perch';
}

/** 首頁模型選單順序：BirdNET、SILIC 標 fast；Perch 置底標 expert。 */
export const LANDING_MODEL_OPTIONS = [
  { value: 'birdnet', tag: 'fast' },
  { value: 'silic', tag: 'fast' },
  { value: 'perch', tag: 'expert' },
];

export const DEFAULT_MODEL_SELECTION = 'birdnet';

/**
 * @param {string | undefined | null} modelName
 * @param {import('../i18n').LocaleMessages} dict
 */
export function formatLandingModelOption(modelName, dict) {
  const name = getModelDisplayLabel(modelName, dict);
  const tag =
    normalizeModelName(modelName) === 'perch' ? dict.modelTagExpert : dict.modelTagFast;
  return `${name} · ${tag}`;
}

/**
 * @param {string | undefined | null} modelName
 * @param {import('../i18n').LocaleMessages} dict
 */
export function getModelDisplayLabel(modelName, dict) {
  const key = normalizeModelName(modelName);
  const labels = {
    perch: dict.modelPerch,
    birdnet: dict.modelBirdnet,
    silic: dict.modelSilic,
  };
  return labels[key] ?? key;
}

/**
 * @param {{ chunks?: { model_name?: string }[], stream_meta?: { model?: string } }} result
 */
export function resolveResultModelName(result) {
  return (
    result?.chunks?.[0]?.model_name ??
    result?.stream_meta?.model ??
    'perch'
  );
}
