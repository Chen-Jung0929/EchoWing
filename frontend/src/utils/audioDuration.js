export const MIN_AUDIO_DURATION_SEC = 5;
export const MAX_AUDIO_DURATION_SEC = 30;

export async function decodeAudioDuration(file) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    return Number.isFinite(audioBuffer.duration) ? audioBuffer.duration : null;
  } finally {
    context.close?.().catch?.(() => {});
  }
}
