import { useState } from 'react';
import SpeciesActivityTimeline from './SpeciesActivityTimeline';
import SpeciesEventTable from './SpeciesEventTable';

export default function TimelineSection({
  timeline,
  dict,
  getLocalizedText,
  lang,
  selectedEvent = null,
  onSelectEvent,
}) {
  const [internalEvent, setInternalEvent] = useState(null);
  const activeEvent = onSelectEvent ? selectedEvent : internalEvent;
  const setActiveEvent = onSelectEvent ?? setInternalEvent;

  if (!timeline) return null;

  const events = timeline.species_events ?? [];

  return (
    <section className="bg-[var(--c-bg)]/72 rounded-2xl p-6 space-y-6">
      <div>
        <h3 className="text-xl font-black text-[var(--c-text)] mb-1">
          {dict.timelineTitle}
        </h3>
        <p className="text-xs text-[var(--c-text)]/50 mb-4">
          {dict.timelineHint}
        </p>
        <SpeciesActivityTimeline
          timeline={timeline}
          dict={dict}
          getLocalizedText={getLocalizedText}
          lang={lang}
          selectedEvent={activeEvent}
          onSelectEvent={setActiveEvent}
        />
      </div>

      <div>
        <h3 className="text-lg font-black text-[var(--c-text)] mb-3">
          {dict.eventTableTitle}
        </h3>
        <SpeciesEventTable
          events={events}
          dict={dict}
          getLocalizedText={getLocalizedText}
          lang={lang}
          selectedEvent={activeEvent}
          onSelectEvent={setActiveEvent}
        />
      </div>
    </section>
  );
}
