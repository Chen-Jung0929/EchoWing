
export function AudioToSpectrogramAnimation({ dict }) {
  return (
    <div className="anim-card audio-to-spec" aria-label="Audio waveform converting to spectrogram animation">
      <div className="flex items-center justify-between w-full h-[120px]">
        
        {/* Waveform */}
        <div className="w-[30%] h-full flex items-center overflow-hidden relative">
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
        <div className="text-2xl text-[var(--c-text)]/50 anim-arrow">→</div>

        {/* Spectrogram Grid */}
        <div className="w-[45%] h-[80px] grid grid-cols-6 grid-rows-4 gap-1 spec-grid">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--c-accent)] rounded-sm spec-cell-glow"
              style={{ animationDelay: `${(i % 6) * 0.15 + (i % 4) * 0.1}s` }}
            />
          ))}
        </div>

      </div>
      <p className="mt-4 text-xs text-center text-[var(--c-text)]/60">
        {dict?.xaiEducation?.animations?.audioToSpec || 'Audio waves are mapped into time-frequency cells.'}
      </p>
    </div>
  );
}
