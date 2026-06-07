
const SPEC_INTENSITIES = [
  0.25, 0.55, 0.35, 0.75, 0.45, 0.65,
  0.40, 0.85, 0.30, 0.70, 0.50, 0.90,
  0.35, 0.60, 0.80, 0.45, 0.55, 0.70,
  0.50, 0.40, 0.65, 0.30, 0.75, 0.45,
];

export function AudioToSpectrogramAnimation({ dict }) {
  return (
    <div className="anim-card audio-to-spec" aria-label="Audio waveform converting to spectrogram animation">
      <div className="flex items-center justify-between gap-3 w-full h-[120px]">

        {/* Waveform */}
        <div className="w-[28%] shrink-0 h-full flex items-center overflow-hidden relative rounded-xl bg-[var(--c-text)]/5">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-[200%] h-[40px] text-[var(--c-primary)] opacity-80 waveform-svg">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              points="0,20 5,5 10,35 15,10 20,30 25,15 30,25 35,5 40,35 45,20 50,20 55,5 60,35 65,10 70,30 75,15 80,25 85,5 90,35 95,20 100,20"
            />
          </svg>
        </div>

        {/* Arrow */}
        <div className="text-2xl text-[var(--c-text)]/50 shrink-0 anim-arrow" aria-hidden="true">→</div>

        {/* Spectrogram Grid */}
        <div className="flex-1 min-w-0 h-[80px] grid grid-cols-6 grid-rows-4 gap-1 spec-grid rounded-xl bg-[var(--c-text)]/5 p-2">
          {SPEC_INTENSITIES.map((intensity, i) => (
            <div
              key={i}
              className="rounded-sm spec-cell-glow"
              style={{
                backgroundColor: `color-mix(in srgb, var(--c-accent) ${Math.round(intensity * 100)}%, transparent)`,
                animationDelay: `${(i % 6) * 0.15 + Math.floor(i / 6) * 0.1}s`,
              }}
            />
          ))}
        </div>

      </div>
      <p className="mt-4 text-xs text-center text-[var(--c-text)]/60">
        {dict?.xaiEducation?.animations?.audioToSpec}
      </p>
    </div>
  );
}
