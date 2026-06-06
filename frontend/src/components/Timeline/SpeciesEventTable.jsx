import { useMemo } from 'react';
import {
  eventsMatchSelection,
  formatPeakTimeRange,
  mergeDuplicateConsecutiveRows,
} from '../../utils/timeline/mergeConsecutiveEvents.js';

export default function SpeciesEventTable({
  events,
  dict,
  getLocalizedText,
  lang,
  selectedEvent,
  onSelectEvent,
}) {
  const displayEvents = useMemo(
    () => mergeDuplicateConsecutiveRows(events ?? []),
    [events]
  );

  if (!displayEvents.length) {
    return (
      <p className="text-sm text-[var(--c-text)]/50 text-center py-4">
        {dict.eventTableNoData}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--c-text)]/10">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="bg-[var(--c-text)]/5 text-[var(--c-text)]/70 text-xs uppercase tracking-wide">
            <th className="px-3 py-2 font-black">{dict.topSpecies}</th>
            <th className="px-3 py-2 font-black">{dict.onset}</th>
            <th className="px-3 py-2 font-black">{dict.offset}</th>
            <th className="px-3 py-2 font-black">{dict.peakTime}</th>
            <th className="px-3 py-2 font-black">{dict.eventConfidence}</th>
            <th className="px-3 py-2 font-black">{dict.boundaryLowConfidence}</th>
          </tr>
        </thead>
        <tbody>
          {displayEvents.map((ev) => {
            const peakEnd = ev.peakTimeEnd ?? ev.peakTime;
            const key = `${ev.species_id}-${ev.onset}-${ev.offset}-${ev.peakTime}-${peakEnd}`;
            const isSelected = eventsMatchSelection(selectedEvent, ev);
            const boundaryWarn =
              ev.boundaryFlags?.onsetLow || ev.boundaryFlags?.offsetLow;

            return (
              <tr
                key={key}
                className={`border-t border-[var(--c-text)]/8 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[var(--c-primary)]/12'
                    : 'hover:bg-[var(--c-text)]/4'
                }`}
                onClick={() => onSelectEvent?.(ev)}
              >
                <td className="px-3 py-2 font-medium text-[var(--c-text)]">
                  {getLocalizedText(ev.name, lang)}
                </td>
                <td className="px-3 py-2 tabular-nums">{ev.onset}s</td>
                <td className="px-3 py-2 tabular-nums">{ev.offset}s</td>
                <td className="px-3 py-2 tabular-nums font-black text-[var(--c-primary)]">
                  {formatPeakTimeRange(ev)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {Math.round((ev.confidence ?? 0) * 100)}%
                </td>
                <td className="px-3 py-2">
                  {boundaryWarn ? (
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">
                      {dict.boundaryLowConfidence}
                    </span>
                  ) : (
                    <span className="text-[var(--c-text)]/35 text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
