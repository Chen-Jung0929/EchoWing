
export function DeconvolutionAnimation({ dict }) {
  const windows = [
    { start: 10, width: 30, score: 0.3 },
    { start: 25, width: 30, score: 0.8 },
    { start: 40, width: 30, score: 0.9 },
    { start: 55, width: 30, score: 0.4 },
  ];

  return (
    <div className="anim-card" aria-label="Deconvolution timeline reconstruction animation">
      
      {/* Top: Windows */}
      <div className="relative h-[40px] w-full border-b border-[var(--c-text)]/10 mb-4">
        {windows.map((w, i) => (
          <div
            key={i}
            className="absolute top-0 h-full rounded opacity-80 decon-window border border-[var(--c-bg)]/20"
            style={{
              left: `${w.start}%`,
              width: `${w.width}%`,
              backgroundColor: `color-mix(in srgb, var(--c-accent) ${w.score * 100}%, transparent)`,
              animationDelay: `${i * 0.4}s`
            }}
          />
        ))}
      </div>

      {/* Middle: Projections */}
      <div className="flex justify-center gap-4 text-xs text-[var(--c-text)]/30 mb-2 decon-arrows">
        <span>↓</span><span>↓</span><span>↓</span><span>↓</span>
      </div>

      {/* Bottom: Activity Curve */}
      <div className="relative h-[50px] w-full flex items-end">
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full text-[var(--c-primary)] opacity-90 decon-curve">
          <path
            d="M 0 50 Q 15 50, 25 35 T 45 10 T 65 30 T 80 45 T 100 50 L 100 50 L 0 50 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <p className="anim-caption mt-4 text-xs text-center text-[var(--c-text)]/60">
        {dict?.xaiEducation?.animations?.deconvolution}
      </p>
    </div>
  );
}
