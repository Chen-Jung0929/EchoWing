const DECONV_LAMBDA = 0.05;
const FISTA_MAX_ITER = 200;

function buildCoverageMatrix(windowStarts, windowSec, durationSec) {
  const tBins = Math.max(1, Math.ceil(durationSec));
  const numWindows = windowStarts.length;
  const a = Array.from({ length: numWindows }, () => new Array(tBins).fill(0));
  for (let i = 0; i < numWindows; i += 1) {
    const start = windowStarts[i];
    for (let t = start; t < Math.min(start + windowSec, tBins); t += 1) {
      a[i][t] = 1;
    }
  }
  const coverage = new Array(tBins).fill(0);
  for (let t = 0; t < tBins; t += 1) {
    for (let i = 0; i < numWindows; i += 1) {
      coverage[t] += a[i][t];
    }
  }
  return { a, coverage, tBins };
}

function matTA(a) {
  const m = a.length;
  const n = a[0]?.length ?? 0;
  const ata = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      let sum = 0;
      for (let r = 0; r < m; r += 1) {
        sum += a[r][i] * a[r][j];
      }
      ata[i][j] = sum;
    }
  }
  return ata;
}

function matVec(mat, vec) {
  return mat.map((row) => row.reduce((sum, v, i) => sum + v * (vec[i] ?? 0), 0));
}

function spectralNorm(ata) {
  const n = ata.length;
  if (!n) return 0;
  let v = new Array(n).fill(1 / Math.sqrt(n));
  let norm = 0;
  for (let k = 0; k < 16; k += 1) {
    const w = matVec(ata, v);
    norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
    if (norm <= 0) return 0;
    v = w.map((x) => x / norm);
  }
  return norm;
}

function softThresholdNonneg(vec, thresh) {
  return vec.map((v) => Math.max(v - thresh, 0));
}

function sparseDeconvolve(a, y, lam = DECONV_LAMBDA) {
  const m = a.length;
  const n = a[0]?.length ?? 0;
  if (!m || !n) return new Array(n).fill(0);

  const ata = matTA(a);
  const aty = new Array(n).fill(0);
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < m; i += 1) {
      aty[j] += a[i][j] * (y[i] ?? 0);
    }
  }

  const lipschitz = spectralNorm(ata);
  if (lipschitz <= 0) return new Array(n).fill(0);
  const step = 1 / lipschitz;
  const proxThresh = lam * step;

  let x = new Array(n).fill(0);
  let yFista = [...x];
  let t = 1;

  for (let iter = 0; iter < FISTA_MAX_ITER; iter += 1) {
    const grad = matVec(ata, yFista).map((g, i) => g - aty[i]);
    const xNew = softThresholdNonneg(
      yFista.map((v, i) => v - step * grad[i]),
      proxThresh
    );
    const tNew = 0.5 * (1 + Math.sqrt(1 + 4 * t * t));
    yFista = xNew.map((v, i) => v + ((t - 1) / tNew) * (xNew[i] - x[i]));
    t = tNew;
    x = xNew;
  }

  return x;
}

function accumulateEvidence(chunks) {
  const windowStarts = [];
  const speciesMeta = new Map();
  const evidence = new Map();

  const sorted = [...(chunks ?? [])]
    .filter((c) => !c.error && c.predictions)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  for (const chunk of sorted) {
    const startSec = chunk.index ?? 0;
    windowStarts.push(startSec);
    const windowIdx = windowStarts.length - 1;
    const observed = new Map();

    const seen = new Set();
    for (const sp of [
      ...(chunk.predictions.top_species ?? []),
      ...(chunk.predictions.reference_species ?? []),
    ]) {
      if (seen.has(sp.species_id)) continue;
      seen.add(sp.species_id);
      observed.set(sp.species_id, sp.probability ?? 0);
      if (!speciesMeta.has(sp.species_id)) {
        speciesMeta.set(sp.species_id, {
          species_id: sp.species_id,
          name: sp.name,
          scientific_name: sp.scientific_name ?? '',
        });
      }
    }

    for (const sid of new Set([...evidence.keys(), ...observed.keys()])) {
      if (!evidence.has(sid)) {
        evidence.set(sid, new Array(windowIdx).fill(0));
      } else if (evidence.get(sid).length < windowIdx) {
        const pad = windowIdx - evidence.get(sid).length;
        evidence.get(sid).push(...new Array(pad).fill(0));
      }
      evidence.get(sid).push(observed.get(sid) ?? 0);
    }
  }

  return { windowStarts, speciesMeta, evidence };
}

/**
 * Build timeline_deconv-shaped payload on the client when the backend omits it.
 * @param {object[]} chunks
 * @param {{ durationSec?: number, windowSec?: number, strideSec?: number }} meta
 */
export function buildTimelineFromChunks(chunks, meta = {}) {
  const durationSec = meta.durationSec > 0 ? meta.durationSec : 30;
  const windowSec = meta.windowSec ?? 5;
  const strideSec = meta.strideSec ?? 1;

  const { windowStarts, speciesMeta, evidence } = accumulateEvidence(chunks);
  if (!windowStarts.length) return null;

  const { a, coverage } = buildCoverageMatrix(windowStarts, windowSec, durationSec);
  const speciesCurves = [];

  for (const [sid, yList] of evidence.entries()) {
    const spMeta = speciesMeta.get(sid);
    if (!spMeta) continue;
    let y = [...yList];
    if (y.length < a.length) {
      y.push(...new Array(a.length - y.length).fill(0));
    } else if (y.length > a.length) {
      y = y.slice(0, a.length);
    }
    const latent = sparseDeconvolve(a, y);
    speciesCurves.push({
      species_id: sid,
      name: spMeta.name,
      scientific_name: spMeta.scientific_name,
      observed_evidence: y,
      latent_activity: latent,
    });
  }

  speciesCurves.sort(
    (a, b) =>
      Math.max(...(b.latent_activity ?? [0])) - Math.max(...(a.latent_activity ?? [0]))
  );

  return {
    event: 'timeline_deconv',
    duration_sec: durationSec,
    window_sec: windowSec,
    stride_sec: strideSec,
    window_starts: windowStarts,
    coverage,
    boundary_low_sec: Math.max(0, windowSec - 1),
    species_curves: speciesCurves,
  };
}
