
const WINDOWS = [
  { start: 0, width: 22, score: 0.12 },
  { start: 16, width: 22, score: 0.38 },
  { start: 32, width: 22, score: 0.84 },
  { start: 48, width: 22, score: 0.71 },
  { start: 64, width: 22, score: 0.25 },
];

export function SlidingWindowAnimation({ dict }) {
  return (
    <div className="anim-card" aria-label="Sliding window prediction animation">
      <div className="timeline-axis flex justify-between text-xs opacity-70 mb-2">
        <span>0s</span>
        <span>30s</span>
      </div>

      <div className="window-track relative h-[100px] rounded-xl border border-[var(--c-text)]/10 bg-[var(--c-text)]/5 overflow-hidden">
        {/* Background waveform hint */}
        <svg
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 w-full text-[var(--c-primary)] opacity-25 pointer-events-none"
          aria-hidden="true"
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            points="0,10 8,4 16,16 24,6 32,14 40,8 48,12 56,5 64,15 72,9 80,13 88,7 96,11 100,10"
          />
        </svg>

        {/* Static ghost windows */}
        {WINDOWS.map((window, index) => (
          <div
            key={`ghost-${index}`}
            className="absolute top-[28px] h-[44px] rounded-xl border border-[var(--c-accent)]/25 pointer-events-none"
            style={{
              left: `${window.start}%`,
              width: `${window.width}%`,
              backgroundColor: `color-mix(in srgb, var(--c-accent) ${Math.round(window.score * 40)}%, transparent)`,
            }}
            aria-hidden="true"
          />
        ))}

        {/* Active sliding window */}
        <div className="sliding-window-active absolute top-[28px] h-[44px] rounded-xl border-2 border-[var(--c-accent)] flex items-center justify-center shadow-lg">
          {WINDOWS.map((window, index) => (
            <span
              key={index}
              className="sliding-window-score text-sm font-bold bg-[var(--c-text)]/80 px-2 py-0.5 rounded-full text-[var(--c-bg)]"
              style={{ animationDelay: `${index}s` }}
            >
              {window.score.toFixed(2)}
            </span>
          ))}
        </div>
      </div>

      <p className="anim-caption mt-4 text-xs text-center text-[var(--c-text)]/60">
        {dict?.xaiEducation?.animations?.slidingWindow}
      </p>
    </div>
  );
}
