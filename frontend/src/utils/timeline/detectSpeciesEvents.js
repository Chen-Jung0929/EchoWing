const PEAK_HEIGHT_RATIO = 0.25;
const ONSET_HEIGHT_RATIO = 0.1;

/**
 * Find local maxima above minHeight.
 * @param {number[]} latent
 * @param {number} minHeight
 * @returns {number[]}
 */
export function findPeaks(latent, minHeight) {
  if (!latent?.length) return [];
  const peaks = [];

  for (let i = 0; i < latent.length; i += 1) {
    const v = latent[i];
    if (v < minHeight) continue;
    const left = i > 0 ? latent[i - 1] : -Infinity;
    const right = i < latent.length - 1 ? latent[i + 1] : -Infinity;
    if (v >= left && v >= right) {
      peaks.push(i);
    }
  }

  return peaks;
}

/**
 * Detect onset / offset / peak events from deconvolved latent activity.
 * @param {{
 *   latentActivity: number[],
 *   coverage: number[],
 *   boundaryLowSec: number,
 *   durationSec: number,
 *   maxCoverage?: number,
 * }} params
 */
export function detectSpeciesEvents({
  latentActivity,
  coverage,
  boundaryLowSec,
  durationSec,
  maxCoverage,
}) {
  const latent = latentActivity ?? [];
  if (!latent.length) return [];

  const maxVal = Math.max(...latent, 0);
  if (maxVal <= 0) return [];

  const height = maxVal * PEAK_HEIGHT_RATIO;
  const onsetThresh = maxVal * ONSET_HEIGHT_RATIO;
  const covMax = maxCoverage ?? Math.max(...(coverage ?? [1]), 1);
  const boundaryEnd = Math.max(0, Math.ceil(durationSec) - boundaryLowSec);

  return findPeaks(latent, height).map((peakTime) => {
    let onset = peakTime;
    while (onset > 0 && latent[onset - 1] >= onsetThresh) {
      onset -= 1;
    }

    let offset = peakTime;
    while (offset < latent.length - 1 && latent[offset + 1] >= onsetThresh) {
      offset += 1;
    }

    const peakActivity = latent[peakTime];
    const coverageWeight = (coverage?.[peakTime] ?? 0) / covMax;
    const confidence = peakActivity * coverageWeight;

    return {
      onset,
      offset,
      peakTime,
      peakActivity,
      confidence,
      boundaryFlags: {
        onsetLow: onset < boundaryLowSec,
        offsetLow: offset >= boundaryEnd,
      },
    };
  });
}
