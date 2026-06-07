
const WINDOWS = [
  { start: 10, width: 30, score: 0.3 },
  { start: 25, width: 30, score: 0.8 },
  { start: 40, width: 30, score: 0.9 },
  { start: 55, width: 30, score: 0.4 },
];

export function DeconvolutionAnimation({ dict }) {
  return (
    <div className="anim-card" aria-label="Deconvolution timeline reconstruction animation">

      {/* Top: Windows */}
      <div className="relative h-[48px] w-full mb-3">
        {WINDOWS.map((w, i) => (
          <div
            key={i}
            className="absolute top-0 h-full rounded-lg decon-window border border-[var(--c-accent)]/30"
            style={{
              left: `${w.start}%`,
              width: `${w.width}%`,
              backgroundColor: `color-mix(in srgb, var(--c-accent) ${Math.round(w.score * 100)}%, transparent)`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Middle: Projections */}
      <div className="flex justify-around text-sm text-[var(--c-accent)] mb-2 decon-arrows" aria-hidden="true">
        {WINDOWS.map((_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.4}s` }}>↓</span>
        ))}
      </div>

      {/* Bottom: Activity Curve */}
      <div className="relative h-[50px] w-full flex items-end rounded-lg bg-[var(--c-text)]/5 overflow-hidden">
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full text-[var(--c-primary)] decon-curve">
          <path
            d="M 0 50 Q 15 50, 25 35 T 45 10 T 65 30 T 80 45 T 100 50 L 100 50 L 0 50 Z"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
      </div>

      <p className="anim-caption mt-4 text-xs text-center text-[var(--c-text)]/60">
        {dict?.xaiEducation?.animations?.deconvolution}
      </p>
    </div>
  );
}
