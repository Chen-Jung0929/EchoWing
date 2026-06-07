import React from 'react';

export function OcclusionXaiAnimation({ dict }) {
  const bars = Array.from({ length: 18 }, (_, index) => {
    const center = 8;
    const distance = Math.abs(index - center);
    const importance = Math.max(0.12, 1 - distance * 0.16);
    return importance;
  });

  return (
    <div className="anim-card occlusion-demo" aria-label="Occlusion XAI animation">
      
      {/* Spectrogram with Mask */}
      <div className="mini-spectrogram relative grid grid-cols-12 auto-rows-[12px] gap-1 p-3 rounded-2xl bg-[var(--c-text)]/5 overflow-hidden">
        {Array.from({ length: 48 }, (_, index) => (
          <span
            key={index}
            className="spec-cell rounded-sm bg-[var(--c-accent)]/30 opacity-40"
            style={{ animationDelay: `${(index % 12) * 0.08}s` }}
          />
        ))}
        <span className="occlusion-mask absolute top-3 bottom-3 w-[18%] rounded-xl bg-black/50 backdrop-blur-sm" />
      </div>

      {/* Confidence Meter */}
      <div className="confidence-meter mt-4 flex items-center gap-3">
        <span className="text-xs uppercase font-bold tracking-wider text-[var(--c-text)]/50">{dict.xaiEducation?.animations?.confidence || 'Confidence'}</span>
        <div className="meter-track flex-1 h-3 rounded-full bg-[var(--c-text)]/10 overflow-hidden">
          <div className="meter-fill h-full bg-[var(--c-primary)] rounded-full" />
        </div>
      </div>

      {/* Importance Heatmap */}
      <div className="importance-bars flex items-end gap-1 h-[50px] mt-4" aria-hidden="true">
        {bars.map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-t-md bg-[var(--c-accent)]/70"
            style={{
              height: `${Math.round(height * 48)}px`,
              animationDelay: `${index * 0.06}s`,
            }}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-center text-[var(--c-text)]/60">
        {dict?.xaiEducation?.animations?.occlusion || 'Masking an important audio segment causes the confidence to drop.'}
      </p>
    </div>
  );
}
