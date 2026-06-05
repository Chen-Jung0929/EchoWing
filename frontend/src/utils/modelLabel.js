/**
 * @param {string | undefined | null} modelName
 * @returns {'perch' | 'birdnet' | 'silic'}
 */
export function normalizeModelName(modelName) {
  const key = String(modelName ?? 'perch').toLowerCase();
  if (key === 'birdnet' || key === 'silic' || key === 'perch') return key;
  return 'perch';
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
