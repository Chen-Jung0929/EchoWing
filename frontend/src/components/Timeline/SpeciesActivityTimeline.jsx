import { useCallback, useEffect, useRef, useState } from 'react';

import { getSpeciesMarkerColor } from '../../utils/timeline/eventRangeSegments.js';
import { eventsMatchSelection, getEventPeakTimes } from '../../utils/timeline/mergeConsecutiveEvents.js';

const ROW_HEIGHT = 36;
const PAD_LEFT = 48;
const PAD_RIGHT = 12;
const PAD_TOP = 28;
const PAD_BOTTOM = 24;
const PX_PER_SEC = 28;
const DRAG_THRESHOLD_PX = 4;

function drawBoundaryZones(ctx, width, height, durationSec, boundaryLowSec, css) {
  if (boundaryLowSec <= 0 || durationSec <= 0) return;

  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const secToX = (sec) => PAD_LEFT + (sec / durationSec) * plotW;

  ctx.save();
  ctx.fillStyle = css.boundaryFill;
  ctx.fillRect(PAD_LEFT, PAD_TOP, secToX(boundaryLowSec) - PAD_LEFT, height - PAD_TOP - PAD_BOTTOM);

  const rightStart = secToX(Math.max(0, durationSec - boundaryLowSec));
  ctx.fillRect(rightStart, PAD_TOP, PAD_LEFT + plotW - rightStart, height - PAD_TOP - PAD_BOTTOM);

  ctx.strokeStyle = css.boundaryStroke;
  ctx.lineWidth = 1;
  const step = 6;
  for (let x = PAD_LEFT - height; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, PAD_TOP);
    ctx.lineTo(x + height, height - PAD_BOTTOM);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSelectionBand(ctx, width, height, durationSec, selectedEvent, css) {
  if (!selectedEvent || durationSec <= 0) return;
  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const secToX = (sec) => PAD_LEFT + (sec / durationSec) * plotW;
  const x0 = secToX(selectedEvent.onset);
  const x1 = secToX(Math.min(selectedEvent.offset + 1, durationSec));
  ctx.save();
  ctx.fillStyle = css.selectionFill;
  ctx.fillRect(x0, PAD_TOP, x1 - x0, height - PAD_TOP - PAD_BOTTOM);
  const peakXTimes = getEventPeakTimes(selectedEvent);
  for (const peakTime of peakXTimes) {
    const peakX = secToX(peakTime + 0.5);
    ctx.strokeStyle = css.peakSelected;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(peakX, PAD_TOP);
    ctx.lineTo(peakX, height - PAD_BOTTOM);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpeciesRow(ctx, species, rowY, durationSec, css, selectedEvent, speciesColor) {
  const width = ctx.canvas.width;
  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const secToX = (sec) => PAD_LEFT + (sec / durationSec) * plotW;
  const latent = species.latent_activity ?? [];
  const maxVal = Math.max(...latent, 0.001);

  ctx.strokeStyle = speciesColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  latent.forEach((v, t) => {
    const x = secToX(t + 0.5);
    const y = rowY + ROW_HEIGHT - 6 - (v / maxVal) * (ROW_HEIGHT - 12);
    if (t === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  for (const ev of species.events ?? []) {
    const eventWithSpecies = { ...ev, species_id: species.species_id };
    const isSelected = selectedEvent && eventsMatchSelection(selectedEvent, eventWithSpecies);

    for (const peakTime of getEventPeakTimes(ev)) {
      const x = secToX(peakTime + 0.5);
      const y = rowY + ROW_HEIGHT / 2;
      const size = isSelected ? 5 : 4;
      ctx.fillStyle = isSelected ? css.peakSelected : speciesColor;
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export default function SpeciesActivityTimeline({
  timeline,
  dict,
  getLocalizedText,
  lang,
  selectedEvent,
  onSelectEvent,
}) {
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const dragRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  const species = timeline?.species ?? [];
  const durationSec = timeline?.duration_sec ?? 30;
  const boundaryLowSec = timeline?.boundary_low_sec ?? 0;
  const speciesOrder = species.map((sp) => sp.species_id);
  const plotWidth = Math.max(
    viewportWidth,
    Math.ceil(durationSec * PX_PER_SEC) + PAD_LEFT + PAD_RIGHT
  );
  const canvasHeight = PAD_TOP + PAD_BOTTOM + species.length * ROW_HEIGHT;
  const scrollable = plotWidth > viewportWidth + 1;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setViewportWidth(Math.floor(w));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [species.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || plotWidth <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(plotWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);
    canvas.style.width = `${plotWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, plotWidth, canvasHeight);

    const styles = getComputedStyle(canvas);
    const css = {
      text: styles.getPropertyValue('--c-text').trim() || '#334155',
      textMuted: styles.getPropertyValue('--c-text-muted').trim() || 'rgba(51,65,85,0.45)',
      boundaryFill: 'rgba(148, 163, 184, 0.12)',
      boundaryStroke: 'rgba(148, 163, 184, 0.2)',
      peakSelected: '#f59e0b',
      selectionFill: 'rgba(245, 158, 11, 0.12)',
      grid: 'rgba(148, 163, 184, 0.25)',
    };

    drawBoundaryZones(ctx, plotWidth, canvasHeight, durationSec, boundaryLowSec, css);
    drawSelectionBand(ctx, plotWidth, canvasHeight, durationSec, selectedEvent, css);

    const plotW = plotWidth - PAD_LEFT - PAD_RIGHT;
    ctx.fillStyle = css.textMuted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let s = 0; s <= durationSec; s += 5) {
      const x = PAD_LEFT + (s / durationSec) * plotW;
      ctx.fillText(`${s}s`, x, canvasHeight - 6);
      ctx.strokeStyle = css.grid;
      ctx.beginPath();
      ctx.moveTo(x, PAD_TOP);
      ctx.lineTo(x, canvasHeight - PAD_BOTTOM);
      ctx.stroke();
    }

    species.forEach((sp, i) => {
      const rowY = PAD_TOP + i * ROW_HEIGHT;
      const speciesColor = getSpeciesMarkerColor(sp.species_id, speciesOrder);
      ctx.fillStyle = css.text;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      const label = getLocalizedText(sp.name, lang);
      ctx.fillText(label.length > 8 ? `${label.slice(0, 7)}…` : label, PAD_LEFT - 6, rowY + ROW_HEIGHT / 2 + 4);
      drawSpeciesRow(ctx, sp, rowY, durationSec, css, selectedEvent, speciesColor);
    });
  }, [
    species,
    durationSec,
    boundaryLowSec,
    selectedEvent,
    getLocalizedText,
    lang,
    plotWidth,
    canvasHeight,
    speciesOrder,
  ]);

  const pickEventAt = useCallback(
    (clientX) => {
      const canvas = canvasRef.current;
      if (!canvas || !onSelectEvent) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const plotW = plotWidth - PAD_LEFT - PAD_RIGHT;
      const clickSec = ((x - PAD_LEFT) / plotW) * durationSec;

      let best = null;
      let bestDist = Infinity;
      for (const sp of species) {
        for (const ev of sp.events ?? []) {
          for (const peakTime of getEventPeakTimes(ev)) {
            const dist = Math.abs(peakTime + 0.5 - clickSec);
            if (dist < 1.5 && dist < bestDist) {
              bestDist = dist;
              best = { ...ev, species_id: sp.species_id, name: sp.name, peakTime };
            }
          }
        }
      }
      onSelectEvent(best);
    },
    [durationSec, onSelectEvent, plotWidth, species]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    dragRef.current = {
      startX: e.clientX,
      startScrollLeft: scrollEl.scrollLeft,
      moved: false,
      pointerId: e.pointerId,
    };
    scrollEl.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current;
    const scrollEl = scrollRef.current;
    if (!drag || !scrollEl) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX) drag.moved = true;
    if (drag.moved) {
      scrollEl.scrollLeft = drag.startScrollLeft - dx;
    }
  }, []);

  const handlePointerUp = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const moved = drag.moved;
      scrollRef.current?.releasePointerCapture?.(drag.pointerId);
      endDrag();
      if (!moved) pickEventAt(e.clientX);
    },
    [endDrag, pickEventAt]
  );

  if (!species.length) {
    return (
      <p className="text-sm text-[var(--c-text)]/50 text-center py-4">
        {dict.timelineNoData}
      </p>
    );
  }

  return (
    <div>
      <div
        ref={scrollRef}
        className={`rounded-xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/40 overflow-x-auto overflow-y-hidden select-none touch-pan-x ${
          scrollable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={endDrag}
      >
        <canvas
          ref={canvasRef}
          className="block"
          role="img"
          aria-label={dict.timelineTitle}
        />
      </div>
      <p className="mt-2 text-[10px] text-[var(--c-text)]/45 text-center">
        {scrollable ? `${dict.boundaryZoneHint} · ${dict.timelinePanHint}` : dict.boundaryZoneHint}
      </p>
    </div>
  );
}
