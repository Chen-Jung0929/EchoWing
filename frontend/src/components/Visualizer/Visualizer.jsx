import { useRef, useEffect } from 'react';

const COLOR_GRAY = 'rgba(148, 163, 184, 0.55)';
const COLOR_FOCUS_BASE = 'rgba(239, 68, 68';
const BAR_WIDTH = 3;
const BAR_GAP = 1;

export default function Visualizer({
  audioBlob,
  attentionWeights,
  chunkIndex,
  dict,
  lang = 'zh',
  compact = false,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!audioBlob || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const drawWaveform = async () => {
      ctx.clearRect(0, 0, width, height);

      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        await audioCtx.close();

        const signalData = audioBuffer.getChannelData(0);
        const numSamples = signalData.length;
        const weightsArray = attentionWeights || [];

        const totalBars = Math.floor(width / (BAR_WIDTH + BAR_GAP));
        const samplesPerBar = Math.ceil(numSamples / totalBars);
        const barsPerWeight =
          weightsArray.length > 0
            ? Math.max(1, Math.floor(totalBars / weightsArray.length))
            : totalBars;

        let currentX = 0;

        for (let i = 0; i < totalBars; i++) {
          const offset = i * samplesPerBar;
          let peak = 0;
          for (let j = 0; j < samplesPerBar && offset + j < numSamples; j++) {
            const amplitude = Math.abs(signalData[offset + j]);
            if (amplitude > peak) peak = amplitude;
          }

          const barHeight = peak * (height / 2);
          const weightIndex = Math.floor(i / barsPerWeight);
          const weight = weightsArray[weightIndex] || 0;

          const barColor =
            weightsArray.length === 0
              ? COLOR_GRAY
              : `${COLOR_FOCUS_BASE}, ${Math.min(1, weight * 1.2)})`;

          ctx.fillStyle = barColor;
          const centerY = height / 2;
          ctx.fillRect(currentX, centerY - barHeight, BAR_WIDTH, barHeight * 2);

          currentX += BAR_WIDTH + BAR_GAP;
        }
      } catch (err) {
        console.error('Waveform decode/render failed:', err);
      }
    };

    drawWaveform();
  }, [audioBlob, attentionWeights, chunkIndex]);

  const title = dict?.attentionWeights ;
  const hint = dict?.xaiRedHeatmapHint;
  const meta = dict?.visualizerChunkSummary?.replace('{chunkIndex}', chunkIndex + 1);

  return (
    <div
      className={
        compact
          ? 'bg-white p-4 rounded-lg'
          : 'bg-[var(--c-bg)]/72 rounded-2xl p-6 mt-6'
      }
    >
      <div className="flex justify-between items-center mb-4 gap-3">
        <h3
          className={`font-black text-[var(--c-text)] ${compact ? 'text-base' : 'text-xl'}`}
        >
          {title}
        </h3>
        <span className="text-xs text-[var(--c-text)]/45 font-mono shrink-0">{meta}</span>
      </div>

      <canvas
        ref={canvasRef}
        width="800"
        height="120"
        className="w-full h-32 border border-[var(--c-text)]/10 rounded-xl bg-[var(--c-card)]/50"
      />

      <p className="text-sm text-[var(--c-text)]/50 mt-3 text-right">{hint}</p>
    </div>
  );
}
