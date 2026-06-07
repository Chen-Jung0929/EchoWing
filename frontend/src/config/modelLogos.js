/** Same order as `dict.guideModels`: Perch → BirdNET → SILIC */
export const GUIDE_MODEL_LOGOS = [
  { src: '/logo_perch.png', wide: false },
  { src: '/logo_birdnet.png', wide: false },
  { src: '/logo_silic.svg', wide: true },
];

/**
 * @param {number} index
 * @returns {{ src: string, wide: boolean } | null}
 */
export function getGuideModelLogo(index) {
  return GUIDE_MODEL_LOGOS[index] ?? null;
}
