/**
 * All peak seconds for an event (explicit list or inferred from range).
 * @param {{ peakTime?: number, peakTimeEnd?: number, peakTimes?: number[] }} event
 * @returns {number[]}
 */
export function getEventPeakTimes(event) {
  if (event?.peakTimes?.length) return [...event.peakTimes];
  const start = event?.peakTime ?? 0;
  const end = event?.peakTimeEnd ?? start;
  const peaks = [];
  for (let t = start; t <= end; t += 1) peaks.push(t);
  return peaks;
}

/**
 * Merge consecutive peak seconds into { start, end } ranges.
 * @param {number[]} peaks
 * @returns {{ start: number, end: number }[]}
 */
export function groupPeakTimesIntoRanges(peaks) {
  const sorted = [...new Set(peaks ?? [])].sort((a, b) => a - b);
  if (!sorted.length) return [];

  /** @type {{ start: number, end: number }[]} */
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push({ start, end });
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push({ start, end });
  return ranges;
}

function syncPeakFields(event) {
  if (!event.peakTimes?.length) {
    event.peakTimes = getEventPeakTimes(event);
  }
  const peaks = event.peakTimes;
  if (peaks.length) {
    if (!peaks.includes(event.peakTime)) {
      event.peakTime = peaks[0];
    }
    event.peakTimeEnd = peaks[peaks.length - 1];
  }
  return event;
}

function resolvePrimaryPeakTime(events, peaks) {
  if (!peaks.length) return 0;
  let bestTime = peaks[0];
  let bestScore = -Infinity;

  for (const ev of events) {
    for (const t of getEventPeakTimes(ev)) {
      const score =
        (t === ev.peakTime ? (ev.peakActivity ?? 0) : 0) + (ev.confidence ?? 0) * 0.001;
      if (t === ev.peakTime && score >= bestScore) {
        bestScore = score;
        bestTime = t;
      }
    }
  }

  return bestTime;
}

/**
 * Merge adjacent detected events for a single species timeline row.
 * @param {object[]} events
 * @returns {object[]}
 */
export function mergeConsecutiveEvents(events) {
  if (!events?.length) return [];

  const sorted = [...events].sort((a, b) => a.peakTime - b.peakTime);
  const merged = [];

  for (const ev of sorted) {
    const last = merged[merged.length - 1];
    if (last && ev.onset <= last.offset + 1) {
      last.onset = Math.min(last.onset, ev.onset);
      last.offset = Math.max(last.offset, ev.offset);
      last.confidence = Math.max(last.confidence ?? 0, ev.confidence ?? 0);
      last.peakTimes = [...new Set([...getEventPeakTimes(last), ...getEventPeakTimes(ev)])].sort(
        (a, b) => a - b
      );
      last.peakTime = last.peakTimes[0];
      last.peakTimeEnd = last.peakTimes[last.peakTimes.length - 1];

      if ((ev.confidence ?? 0) >= (last._peakConfidence ?? last.confidence ?? 0)) {
        last.peakTime = ev.peakTime;
        last.peakActivity = ev.peakActivity ?? last.peakActivity;
        last._peakConfidence = ev.confidence ?? 0;
      }

      if (ev.boundaryFlags || last.boundaryFlags) {
        last.boundaryFlags = {
          onsetLow: Boolean(last.boundaryFlags?.onsetLow || ev.boundaryFlags?.onsetLow),
          offsetLow: Boolean(last.boundaryFlags?.offsetLow || ev.boundaryFlags?.offsetLow),
        };
      }
    } else {
      merged.push(syncPeakFields({ ...ev, _peakConfidence: ev.confidence ?? 0 }));
    }
  }

  return merged.map(({ _peakConfidence, ...ev }) => syncPeakFields(ev));
}

/**
 * Build one table row per species: keep only max-confidence events, merge adjacent peaks into ranges.
 * @param {object[]} events
 * @returns {object[]}
 */
export function mergeDuplicateConsecutiveRows(events) {
  if (!events?.length) return [];

  /** @type {Map<string, object[]>} */
  const bySpecies = new Map();
  for (const ev of events) {
    const sid = ev.species_id ?? '';
    if (!bySpecies.has(sid)) bySpecies.set(sid, []);
    bySpecies.get(sid).push(ev);
  }

  const rows = [];

  for (const speciesEvents of bySpecies.values()) {
    const maxConf = Math.max(...speciesEvents.map((ev) => ev.confidence ?? 0));
    const topEvents = speciesEvents.filter((ev) => (ev.confidence ?? 0) === maxConf);
    if (!topEvents.length) continue;

    const peakTimes = [...new Set(topEvents.flatMap(getEventPeakTimes))].sort((a, b) => a - b);
    const template = topEvents.reduce((best, ev) =>
      (ev.peakActivity ?? 0) > (best.peakActivity ?? 0) ? ev : best
    );

    rows.push(
      syncPeakFields({
        ...template,
        confidence: maxConf,
        onset: Math.min(...topEvents.map((ev) => ev.onset)),
        offset: Math.max(...topEvents.map((ev) => ev.offset)),
        peakTimes,
        peakTime: resolvePrimaryPeakTime(topEvents, peakTimes),
        peakTimeEnd: peakTimes[peakTimes.length - 1],
        boundaryFlags: {
          onsetLow: topEvents.some((ev) => ev.boundaryFlags?.onsetLow),
          offsetLow: topEvents.some((ev) => ev.boundaryFlags?.offsetLow),
        },
      })
    );
  }

  rows.sort((a, b) => b.confidence - a.confidence || a.peakTime - b.peakTime);
  return rows;
}

/**
 * @param {object | null | undefined} selectedEvent
 * @param {object | null | undefined} event
 */
export function eventsMatchSelection(selectedEvent, event) {
  if (!selectedEvent || !event) return false;
  if (selectedEvent.species_id !== event.species_id) return false;

  const selectedPeaks = getEventPeakTimes(selectedEvent);
  const eventPeaks = getEventPeakTimes(event);
  return selectedPeaks.some((peak) => eventPeaks.includes(peak));
}

/**
 * @param {{ peakTime?: number, peakTimeEnd?: number, peakTimes?: number[] }} event
 */
export function formatPeakTimeRange(event) {
  return groupPeakTimesIntoRanges(getEventPeakTimes(event))
    .map(({ start, end }) => (start === end ? `${start}s` : `${start}~${end}s`))
    .join(', ');
}
