import { useEffect, useMemo, useRef, useState } from 'react';
import {
  computeSpectrogramCanvasSize,
  drawSpectrogramPayload,
  estimateSpectrogramDurationSec,
  PX_PER_TIME_FRAME,
  SPECTROGRAM_CANVAS_HEIGHT,
} from '../../utils/spectrogramCache';

const COMPACT_MAX_WIDTH = 680;

export default function SpectrogramView({
  spectrogram,
  chunkIndex,
  segmentCount,
  variant = 'chunk',
  dict,
  lang = 'zh',
  compact = false,
  heatmap = null,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const isSummary = variant === 'summary';
  const displayHeight = compact ? '10rem' : '11rem';
  const canvasHeight = compact ? 180 : SPECTROGRAM_CANVAS_HEIGHT;

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

  useEffect(() => {
    if (!spectrogram || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSpectrogramPayload(ctx, spectrogram, canvas.width, canvas.height);
  }, [spectrogram, canvasSize.width, canvasSize.height]);

  if (!spectrogram) {
    return (
      <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
        {lang === 'zh' ? '尚無頻譜資料' : 'No spectrogram data'}
      </p>
    );
  }

  const title = dict?.spectrogramTitle ?? (lang === 'zh' ? '音訊頻譜圖' : 'Spectrogram');
  const hint =
    dict?.spectrogramHint ??
    (lang === 'zh'
      ? '橫軸為時間、縱軸為頻率（Mel）；由後端運算'
      : 'Time vs Mel frequency; computed on the server');
  const durationSec = estimateSpectrogramDurationSec(spectrogram).toFixed(1);

  const meta =
    isSummary
      ? lang === 'zh'
        ? `總覽 · ${segmentCount ?? 1} 段 · ${durationSec}s · ${spectrogram.time_frames}×${spectrogram.freq_bins}`
        : `Overview · ${segmentCount ?? 1} segments · ${durationSec}s · ${spectrogram.time_frames}×${spectrogram.freq_bins}`
      : lang === 'zh'
        ? `片段 ${chunkIndex + 1} · ${durationSec}s · ${spectrogram.time_frames}×${spectrogram.freq_bins}`
        : `Segment ${chunkIndex + 1} · ${durationSec}s · ${spectrogram.time_frames}×${spectrogram.freq_bins}`;

  const shellStyle = compact
    ? { background: '#ffffff', padding: '1rem', borderRadius: '0.5rem' }
    : {
        backgroundColor: 'var(--c-bg)',
        borderRadius: '1rem',
        padding: '1.5rem',
        marginTop: '1.5rem',
      };

  const canvasStyle = isSummary
    ? {
        width: '100%',
        height: displayHeight,
        border: '1px solid rgba(57, 77, 101, 0.15)',
        borderRadius: '0.75rem',
        background: '#f8fafc',
        display: 'block',
      }
    : {
        width: `${canvasSize.width}px`,
        maxWidth: '100%',
        height: displayHeight,
        border: '1px solid rgba(57, 77, 101, 0.15)',
        borderRadius: '0.75rem',
        background: '#f8fafc',
        display: 'block',
      };

  const canvasWrapStyle = isSummary
    ? { width: '100%', borderRadius: '0.75rem' }
    : {
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        borderRadius: '0.75rem',
      };

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

      <div ref={isSummary && !compact ? containerRef : undefined} style={{...canvasWrapStyle, position: 'relative'}}>
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={canvasStyle}
        />
        {heatmap && heatmap.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            pointerEvents: 'none',
            borderRadius: '0.75rem',
            overflow: 'hidden',
          }}>
            {heatmap.map((weight, index) => (
              <div 
                key={index} 
                style={{
                  flex: 1,
                  backgroundColor: `rgba(239, 68, 68, ${weight * 0.5})`, // Red overlay with alpha proportional to importance
                }}
              />
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.75rem', textAlign: 'right' }}>
        {hint}
      </p>
    </div>
  );
}
