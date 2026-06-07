import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildEventRangeSegments,
  segmentMatchesSelection,
} from '../../utils/timeline/eventRangeSegments.js';
import { createPortal } from 'react-dom';
import { MdClose, MdZoomIn } from 'react-icons/md';
import {
  computeSpectrogramCanvasSize,
  drawSpectrogramPayload,
  drawXaiStripBelow,
  estimateSpectrogramDurationSec,
  resampleHeatmapToFrames,
  PX_PER_TIME_FRAME,
  SPECTROGRAM_CANVAS_HEIGHT,
  XAI_STRIP_CANVAS_HEIGHT,
} from '../../utils/spectrogramCache';

const COMPACT_MAX_WIDTH = 680;
const ENLARGE_CANVAS_HEIGHT = 420;
const ENLARGE_XAI_STRIP_HEIGHT = 48;
const ENLARGE_PX_PER_FRAME = 3;

function splitHintBySemicolon(text) {
  return String(text ?? '')
    .split(/[;；]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildSpectrogramHintLines(hint, { enlargePrefix = '' } = {}) {
  const segments = splitHintBySemicolon(hint);
  if (!enlargePrefix) return segments.length ? segments : [hint].filter(Boolean);
  if (segments.length === 0) return [enlargePrefix];
  if (segments.length === 1) return [`${enlargePrefix} · ${segments[0]}`];
  return [`${enlargePrefix} · ${segments[0]}`, ...segments.slice(1)];
}

function SpectrogramHintText({ lines, className, style }) {
  if (!lines?.length) return null;
  return (
    <p className={className} style={style}>
      {lines.map((line, index) => (
        <span key={line}>
          {index > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </p>
  );
}

function SpectrogramEventSegmentLabels({
  events,
  durationSec,
  selectedEvent,
  onSelectEvent,
  getLocalizedText,
  lang,
}) {
  const segments = useMemo(() => buildEventRangeSegments(events), [events]);
  if (!segments.length || durationSec <= 0) return null;

  const laneCount = Math.max(...segments.map((seg) => seg.lane)) + 1;
  const laneHeight = 22;
  const height = laneCount * laneHeight + 8;

  return (
    <div
      className="relative w-full border-b border-[var(--c-text)]/10 bg-[var(--c-bg)]/55"
      style={{ height }}
      role="list"
      aria-label={dict?.spectrogramEventLabels}
    >
      {segments.map((seg) => {
        const spanSec = seg.end - seg.start + 1;
        const leftPct = (seg.start / durationSec) * 100;
        const widthPct = (spanSec / durationSec) * 100;
        const centerPct = leftPct + widthPct / 2;
        const name = getLocalizedText?.(seg.name, lang) ?? seg.species_id ?? '';
        const shortName = name.length > 10 ? `${name.slice(0, 9)}…` : name;
        const isSelected = segmentMatchesSelection(selectedEvent, seg);

        return (
          <button
            key={`${seg.species_id}-${seg.start}-${seg.end}`}
            type="button"
            role="listitem"
            className={`absolute flex max-w-[9rem] -translate-x-1/2 flex-col items-center border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)] rounded-sm ${
              onSelectEvent ? 'cursor-pointer' : 'cursor-default'
            }`}
            style={{
              left: `${centerPct}%`,
              top: seg.lane * laneHeight + 4,
              width: `${Math.max(widthPct, 100 / durationSec)}%`,
              minWidth: '2.75rem',
            }}
            title={`${name} · ${seg.rangeLabel}`}
            onClick={() => onSelectEvent?.({ ...seg.event, peakTime: seg.start })}
          >
            <span
              className="w-full truncate rounded px-1 py-0.5 text-center text-[9px] font-bold leading-tight text-white"
              style={{
                backgroundColor: seg.color,
                outline: isSelected ? '2px solid #f59e0b' : undefined,
                outlineOffset: 1,
              }}
            >
              {shortName} · {seg.rangeLabel}
            </span>
            <span
              className="block h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent"
              style={{ borderTopColor: seg.color }}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

function SpectrogramPlot({
  spectrogram,
  alignedXai,
  hasXai,
  xaiGenerating,
  canvasSize,
  displayHeight,
  xaiStripDisplayPx,
  xaiStripCanvasH,
  generatingLabel,
  onEnlarge,
  enlargeLabel,
  borderless = false,
}) {
  const canvasRef = useRef(null);
  const xaiCanvasRef = useRef(null);

  useEffect(() => {
    if (!spectrogram || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSpectrogramPayload(ctx, spectrogram, canvas.width, canvas.height);
  }, [spectrogram, canvasSize.width, canvasSize.height]);

  useEffect(() => {
    if (!hasXai || !xaiCanvasRef.current) return;
    const canvas = xaiCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || !alignedXai) return;
    drawXaiStripBelow(ctx, alignedXai, canvas.width, canvas.height);
  }, [hasXai, alignedXai, canvasSize.width, xaiStripCanvasH]);

  const plotWrapStyle = {
    width: '100%',
    border: borderless ? 'none' : '1px solid rgba(57, 77, 101, 0.15)',
    borderRadius: borderless ? 0 : '0.75rem',
    overflow: 'hidden',
    background: '#f8fafc',
    position: 'relative',
  };

  const specCanvasStyle = {
    width: '100%',
    height: displayHeight,
    display: 'block',
    verticalAlign: 'top',
  };

  const xaiCanvasStyle = {
    width: '100%',
    height: `${xaiStripDisplayPx}px`,
    display: 'block',
  };

  const plotBody = (
    <>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={specCanvasStyle}
      />
      {hasXai ? (
        <canvas
          ref={xaiCanvasRef}
          width={canvasSize.width}
          height={xaiStripCanvasH}
          style={xaiCanvasStyle}
          aria-hidden
        />
      ) : null}
      {xaiGenerating ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(248, 250, 252, 0.72)',
            pointerEvents: 'none',
          }}
          role="status"
          aria-live="polite"
        >
          <span
            style={{
              fontSize: '0.9375rem',
              fontWeight: 800,
              color: '#394d65',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {generatingLabel}
          </span>
        </div>
      ) : null}
    </>
  );

  if (!onEnlarge) {
    return <div style={plotWrapStyle}>{plotBody}</div>;
  }

  return (
    <button
      type="button"
      onClick={onEnlarge}
      aria-label={enlargeLabel}
      className="group relative w-full cursor-zoom-in rounded-[0.75rem] border-0 bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]"
    >
      <div style={plotWrapStyle}>
        {plotBody}
        {!xaiGenerating ? (
          <span
            className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-full border border-[var(--c-text)]/10 bg-white/90 px-2 py-1 text-[10px] font-bold text-[var(--c-text)]/70 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          >
            <MdZoomIn size={14} />
          </span>
        ) : null}
      </div>
    </button>
  );
}

function SpectrogramEnlargeModal({
  open,
  onClose,
  spectrogram,
  alignedXai,
  hasXai,
  xaiGenerating,
  title,
  meta,
  hint,
  hintLines,
  generatingLabel,
  generatingHint,
  dict,
}) {
  const enlargeSize = useMemo(() => {
    if (!spectrogram) {
      return { width: 800, height: ENLARGE_CANVAS_HEIGHT };
    }
    const maxW =
      typeof window !== 'undefined' ? Math.floor(window.innerWidth * 0.92) : 1200;
    const naturalW = Math.round(spectrogram.time_frames * ENLARGE_PX_PER_FRAME);
    return {
      width: Math.min(maxW, Math.max(naturalW, 640)),
      height: ENLARGE_CANVAS_HEIGHT,
      pxPerFrame: ENLARGE_PX_PER_FRAME,
    };
  }, [spectrogram]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined' || !spectrogram) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[240] cursor-default bg-black/55"
        aria-label={dict?.spectrogramEnlargeClose }
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dict?.spectrogramEnlarge }
        className="fixed left-1/2 top-1/2 z-[250] flex max-h-[92vh] w-[min(92vw,72rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-card)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--c-text)]/10 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-[var(--c-text)]">{title}</h3>
            <p className="mt-0.5 font-mono text-xs text-[var(--c-text)]/55">{meta}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict?.spectrogramEnlargeClose }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--c-text)]/10 text-[var(--c-text)] transition-colors hover:bg-[var(--c-bg)]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]"
          >
            <MdClose size={20} aria-hidden />
          </button>
        </div>

        <div className="overflow-auto p-4">
          <SpectrogramPlot
            spectrogram={spectrogram}
            alignedXai={alignedXai}
            hasXai={hasXai}
            xaiGenerating={xaiGenerating}
            canvasSize={enlargeSize}
            displayHeight="min(55vh, 26rem)"
            xaiStripDisplayPx={ENLARGE_XAI_STRIP_HEIGHT}
            xaiStripCanvasH={ENLARGE_XAI_STRIP_HEIGHT}
            generatingLabel={generatingLabel}
          />
        </div>

        <SpectrogramHintText
          className="border-t border-[var(--c-text)]/10 px-4 py-3 text-right text-xs text-[var(--c-text)]/55"
          lines={xaiGenerating ? [generatingHint] : hintLines ?? splitHintBySemicolon(hint)}
        />
      </div>
    </>,
    document.body
  );
}

export default function SpectrogramView({
  spectrogram,
  chunkIndex,
  segmentCount,
  variant = 'chunk',
  dict,
  lang = 'zh',
  compact = false,
  xaiHeatmap = null,
  xaiGenerating = false,
  eventMarkers = null,
  markerDurationSec = 0,
  selectedEvent = null,
  onSelectEvent = null,
  getLocalizedText = null,
  shellMarginTop = null,
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [enlarged, setEnlarged] = useState(false);

  const isSummary = variant === 'summary';
  const displayHeight = compact ? '10rem' : '11rem';
  const canvasHeight = compact ? 180 : SPECTROGRAM_CANVAS_HEIGHT;
  const xaiStripDisplayPx = compact ? 28 : 36;
  const xaiStripCanvasH = compact ? 32 : XAI_STRIP_CANVAS_HEIGHT;

  const alignedXai = useMemo(() => {
    if (!xaiHeatmap?.length || !spectrogram?.time_frames) return null;
    return resampleHeatmapToFrames(xaiHeatmap, spectrogram.time_frames);
  }, [xaiHeatmap, spectrogram]);

  const hasXai = Boolean(alignedXai?.length) && !xaiGenerating;
  const generatingLabel = dict?.xaiGenerating;
  const generatingHint = dict?.xaiGeneratingHint;

  useEffect(() => {
    if (!isSummary || compact) return;
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setContainerWidth(Math.floor(w));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [isSummary, compact]);

  const canvasSize = useMemo(() => {
    if (!spectrogram) return { width: 800, height: canvasHeight };

    if (isSummary) {
      const targetWidth = compact
        ? COMPACT_MAX_WIDTH
        : Math.max(1, containerWidth || 800);
      return {
        width: targetWidth,
        height: canvasHeight,
        pxPerFrame: targetWidth / Math.max(1, spectrogram.time_frames),
      };
    }

    const pxPerFrame = compact
      ? Math.min(PX_PER_TIME_FRAME, COMPACT_MAX_WIDTH / Math.max(1, spectrogram.time_frames))
      : PX_PER_TIME_FRAME;

    return {
      ...computeSpectrogramCanvasSize(spectrogram.time_frames, {
        pxPerFrame,
        height: canvasHeight,
      }),
      pxPerFrame,
    };
  }, [spectrogram, isSummary, compact, containerWidth, canvasHeight]);

  if (!spectrogram) {
    return (
      <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
        {dict?.spectrogramNoData}
      </p>
    );
  }

  const title = dict?.spectrogramTitle;
  const hint =
    dict?.spectrogramXaiHint ??
    dict?.spectrogramHint ??
    dict?.spectrogramDescription;
  const durationSec = estimateSpectrogramDurationSec(spectrogram).toFixed(1);

  const enlargePrefix =
    dict?.spectrogramEnlargeHint ??
    dict?.spectrogramClickToEnlarge;

  const hintLines = compact
    ? splitHintBySemicolon(hint)
    : buildSpectrogramHintLines(hint, { enlargePrefix });

  const meta =
    isSummary
      ? dict?.spectrogramOverviewSummary?.replace('{segmentCount}', segmentCount ?? 1).replace('{durationSec}', durationSec).replace('{time_frames}', spectrogram.time_frames).replace('{freq_bins}', spectrogram.freq_bins)
      : dict?.spectrogramChunkSummary?.replace('{chunkIndex}', chunkIndex + 1).replace('{durationSec}', durationSec).replace('{time_frames}', spectrogram.time_frames).replace('{freq_bins}', spectrogram.freq_bins);

  const shellStyle = compact
    ? { background: '#ffffff', padding: '1rem', borderRadius: '0.5rem' }
    : {
        backgroundColor: 'var(--c-bg)',
        borderRadius: '1rem',
        padding: '1.5rem',
        marginTop: shellMarginTop ?? '1.5rem',
      };

  const markerDuration =
    markerDurationSec > 0
      ? markerDurationSec
      : estimateSpectrogramDurationSec(spectrogram);

  const plotOuterStyle = isSummary
    ? { width: '100%', borderRadius: '0.75rem' }
    : {
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        maxWidth: `${canvasSize.width}px`,
        margin: '0 auto',
        borderRadius: '0.75rem',
      };

  const enlargeLabel = dict?.spectrogramEnlarge;

  return (
    <div style={shellStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <h3
          style={{
            fontWeight: 900,
            color: compact ? '#394d65' : 'var(--c-text)',
            fontSize: compact ? '1rem' : '1.25rem',
            margin: 0,
          }}
        >
          {title}
        </h3>
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
          {meta}
        </span>
      </div>

      <div ref={isSummary && !compact ? containerRef : undefined} style={plotOuterStyle}>
        {eventMarkers?.length ? (
          <div
            className="overflow-hidden rounded-[0.75rem] border border-[var(--c-text)]/15 bg-[#f8fafc]"
          >
            <SpectrogramEventSegmentLabels
              events={eventMarkers}
              durationSec={markerDuration}
              selectedEvent={selectedEvent}
              onSelectEvent={onSelectEvent}
              getLocalizedText={getLocalizedText}
              lang={lang}
            />
            <SpectrogramPlot
              spectrogram={spectrogram}
              alignedXai={alignedXai}
              hasXai={hasXai}
              xaiGenerating={xaiGenerating}
              canvasSize={canvasSize}
              displayHeight={displayHeight}
              xaiStripDisplayPx={xaiStripDisplayPx}
              xaiStripCanvasH={xaiStripCanvasH}
              generatingLabel={generatingLabel}
              onEnlarge={compact ? undefined : () => setEnlarged(true)}
              enlargeLabel={enlargeLabel}
              borderless
            />
          </div>
        ) : (
          <SpectrogramPlot
            spectrogram={spectrogram}
            alignedXai={alignedXai}
            hasXai={hasXai}
            xaiGenerating={xaiGenerating}
            canvasSize={canvasSize}
            displayHeight={displayHeight}
            xaiStripDisplayPx={xaiStripDisplayPx}
            xaiStripCanvasH={xaiStripCanvasH}
            generatingLabel={generatingLabel}
            onEnlarge={compact ? undefined : () => setEnlarged(true)}
            enlargeLabel={enlargeLabel}
          />
        )}
      </div>

      <SpectrogramHintText
        style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.75rem', textAlign: 'right' }}
        lines={xaiGenerating ? [generatingHint] : hintLines}
      />

      <SpectrogramEnlargeModal
        open={enlarged}
        onClose={() => setEnlarged(false)}
        spectrogram={spectrogram}
        alignedXai={alignedXai}
        hasXai={hasXai}
        xaiGenerating={xaiGenerating}
        title={title}
        meta={meta}
        hint={hint}
        hintLines={splitHintBySemicolon(hint)}
        generatingLabel={generatingLabel}
        generatingHint={generatingHint}
        dict={dict}
      />
    </div>
  );
}
