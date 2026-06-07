
export function SlidingWindowAnimation({ dict }) {
  const windows = [
    { start: 0, width: 22, score: 0.12 },
    { start: 16, width: 22, score: 0.38 },
    { start: 32, width: 22, score: 0.84 },
    { start: 48, width: 22, score: 0.71 },
    { start: 64, width: 22, score: 0.25 },
  ];

  return (
    <div className="anim-card" aria-label="Sliding window prediction animation">
      <div className="timeline-axis flex justify-between text-xs opacity-70 mb-2">
        <span>0s</span>
        <span>30s</span>
      </div>

      <div className="window-track relative h-[92px] rounded-xl border border-[var(--c-text)]/10 bg-gradient-to-r from-[var(--c-text)]/5 to-transparent bg-[length:10%_100%]">
        {windows.map((window, index) => (
          <div
            key={index}
            className="sliding-window-block absolute top-[24px] h-[44px] rounded-xl flex items-center justify-center font-bold text-[var(--c-bg)] shadow-xl"
            style={{
              left: `${window.start}%`,
              width: `${window.width}%`,
              animationDelay: `${index * 0.45}s`,
              backgroundColor: `color-mix(in srgb, var(--c-accent) ${window.score * 100}%, transparent)`,
            }}
          >
            <span className="text-sm bg-black/30 px-2 py-0.5 rounded-full text-white">{window.score.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <p className="anim-caption mt-4 text-xs text-center text-[var(--c-text)]/60">
        {dict?.xaiEducation?.animations?.slidingWindow || 'Each window receives its own species score.'}
      </p>
    </div>
  );
}
