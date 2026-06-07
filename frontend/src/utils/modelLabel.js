/**
 * @param {string | undefined | null} modelName
 * @returns {'perch' | 'perch-fast' | 'birdnet' | 'silic'}
 */
export function normalizeModelName(modelName) {
  const key = String(modelName ?? 'birdnet').toLowerCase();
  if (key === 'perch') return 'perch-fast';
  if (key === 'perch-fast' || key === 'birdnet' || key === 'silic') return key;
  return 'birdnet';
}

/** 首頁模型選單（皆為 fast 推論路徑）。 */
export const LANDING_MODEL_OPTIONS = [
  { value: 'birdnet', tag: 'fast' },
  { value: 'silic', tag: 'fast' },
  { value: 'perch-fast', tag: 'fast' },
];

export const DEFAULT_MODEL_SELECTION = 'birdnet';

function modelOptionTag(_modelName, dict) {
  return dict.modelTagFast;
}

/**
 * @param {string | undefined | null} modelName
 * @param {import('../i18n').LocaleMessages} dict
 */
export function formatLandingModelOption(modelName, dict) {
  const name = getModelDisplayLabel(modelName, dict);
  const tag = modelOptionTag(modelName, dict);
  return `${name} · ${tag}`;
}

/**
 * @param {string | undefined | null} modelName
 * @param {import('../i18n').LocaleMessages} dict
 */
export function getModelDisplayLabel(modelName, dict) {
  const key = normalizeModelName(modelName);
  const labels = {
    'perch-fast': dict.modelPerchFast,
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
    'birdnet'
  );
}
