
const SPEC_INTENSITIES = Array.from({ length: 48 }, (_, index) => {
  const col = index % 12;
  const row = Math.floor(index / 12);
  const centerCol = 5.5;
  const centerRow = 1.5;
  const dist = Math.hypot(col - centerCol, row - centerRow);
  return Math.max(0.2, 1 - dist * 0.18);
});

export function OcclusionXaiAnimation({ dict }) {
  const bars = Array.from({ length: 18 }, (_, index) => {
    const center = 8;
    const distance = Math.abs(index - center);
    return Math.max(0.12, 1 - distance * 0.16);
  });

  return (
    <div className="anim-card occlusion-demo" aria-label="Occlusion XAI animation">

      {/* Waveform with occlusion mask */}
      <div className="waveform-occlusion relative h-[44px] rounded-xl bg-[var(--c-text)]/5 overflow-hidden mb-3">
        <svg
          viewBox="0 0 100 30"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full text-[var(--c-primary)] opacity-80"
          aria-hidden="true"
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points="0,15 6,8 12,22 18,10 24,20 30,12 36,18 42,7 48,23 54,11 60,19 66,9 72,21 78,13 84,17 90,10 96,16 100,15"
          />
        </svg>
        <span className="occlusion-mask waveform-mask absolute top-1 bottom-1 w-[20%] rounded-lg" aria-hidden="true" />
      </div>

      {/* Spectrogram with Mask */}
      <div className="mini-spectrogram relative grid grid-cols-12 auto-rows-[12px] gap-1 p-3 rounded-2xl bg-[var(--c-text)]/5 overflow-hidden">
        {SPEC_INTENSITIES.map((intensity, index) => (
          <span
            key={index}
            className="spec-cell rounded-sm"
            style={{
              backgroundColor: `color-mix(in srgb, var(--c-accent) ${Math.round(intensity * 100)}%, transparent)`,
              animationDelay: `${(index % 12) * 0.08}s`,
            }}
          />
        ))}
        <span className="occlusion-mask spec-mask absolute top-3 bottom-3 w-[20%] rounded-xl" aria-hidden="true" />
      </div>

      {/* Confidence Meter */}
      <div className="confidence-meter mt-4 flex items-center gap-3">
        <span className="text-xs uppercase font-bold tracking-wider text-[var(--c-text)]/50 shrink-0">
          {dict.xaiEducation?.animations?.confidence}
        </span>
        <div className="meter-track flex-1 h-3 rounded-full bg-[var(--c-text)]/10 overflow-hidden">
          <div className="meter-fill h-full bg-[var(--c-primary)] rounded-full" />
        </div>
      </div>

      {/* Importance Heatmap */}
      <div className="importance-bars flex items-end gap-1 h-[50px] mt-4" aria-hidden="true">
        {bars.map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-t-md"
            style={{
              height: `${Math.round(height * 48)}px`,
              backgroundColor: `color-mix(in srgb, var(--c-accent) ${Math.round(height * 90)}%, transparent)`,
              animationDelay: `${index * 0.06}s`,
            }}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-center text-[var(--c-text)]/60">
        {dict?.xaiEducation?.animations?.occlusion}
      </p>
    </div>
  );
}
