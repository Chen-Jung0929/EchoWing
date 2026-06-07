import { useCallback, useEffect, useRef, useState } from 'react';
import { MdMic, MdStop } from 'react-icons/md';

const MAX_MS = 30_000;

function pickMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function extensionFromMime(mime) {
  if (!mime) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('webm')) return 'webm';
  return 'webm';
}

function formatClock(ms) {
  const maxSec = MAX_MS / 1000;
  const totalSec = Math.min(Math.floor(ms / 1000), maxSec);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioRecorder({
  dict,
  onRecordingComplete,
  onErrorChange,
  recordingDisabled = false,
}) {
  const [phase, setPhase] = useState('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recorderError, setRecorderError] = useState('');
  const [inputLevel, setInputLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const maxTimerRef = useRef(null);
  const tickRef = useRef(null);
  const startTimeRef = useRef(0);
  const mimeRef = useRef('');
  const audioContextRef = useRef(null);
  const meterFrameRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (maxTimerRef.current) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopMeter = useCallback(() => {
    if (meterFrameRef.current) {
      window.cancelAnimationFrame(meterFrameRef.current);
      meterFrameRef.current = null;
    }
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context) context.close?.().catch?.(() => {});
    setInputLevel(0);
  }, []);

  const startMeter = useCallback((stream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      const context = new AudioContextClass();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      audioContextRef.current = context;

      const update = () => {
        analyser.getByteFrequencyData(samples);
        const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        setInputLevel(Math.min(1, average / 90));
        meterFrameRef.current = window.requestAnimationFrame(update);
      };
      update();
    } catch {
      stopMeter();
    }
  }, [stopMeter]);

  const finalizeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      stopMeter();
      finalizeRecording();
      stopStream();
    };
  }, [clearTimers, finalizeRecording, stopMeter, stopStream]);

  useEffect(() => {
    onErrorChange?.(recorderError);
  }, [recorderError, onErrorChange]);

  const buildFileFromChunks = useCallback(() => {
    const mime = mimeRef.current || 'audio/webm';
    const blob = new Blob(chunksRef.current, { type: mime });
    const ext = extensionFromMime(mime);
    const name = `echowing-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
    return new File([blob], name, { type: mime });
  }, []);

  const handleRecorderStop = useCallback(() => {
    clearTimers();
    stopMeter();
    stopStream();
    mediaRecorderRef.current = null;

    const file = buildFileFromChunks();
    chunksRef.current = [];
    setPhase('idle');
    setElapsedMs(0);
    onRecordingComplete(file);
  }, [buildFileFromChunks, clearTimers, onRecordingComplete, stopMeter, stopStream]);

  const startRecording = async () => {
    if (recordingDisabled || phase !== 'idle') return;

    setRecorderError('');
    chunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecorderError(dict.recorderNotSupported);
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setRecorderError(dict.micPermissionError);
      return;
    }

    streamRef.current = stream;
    startMeter(stream);
    const mime = pickMimeType();
    mimeRef.current = mime;

    let recorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch {
      try {
        recorder = new MediaRecorder(stream);
        mimeRef.current = recorder.mimeType || 'audio/webm';
      } catch {
        stopMeter();
        stopStream();
        setRecorderError(dict.recorderStartError);
        return;
      }
    }

    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = handleRecorderStop;

    startTimeRef.current = Date.now();
    setPhase('recording');
    setElapsedMs(0);

    tickRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 200);

    maxTimerRef.current = window.setTimeout(() => {
      setElapsedMs(MAX_MS);
      setPhase('stopping');
      clearTimers();
      finalizeRecording();
    }, MAX_MS);

    recorder.start(250);
  };

  const stopRecording = () => {
    if (phase !== 'recording') return;
    setPhase('stopping');
    clearTimers();
    finalizeRecording();
  };

  const isRecording = phase === 'recording';

  return (
    <>
      {phase === 'idle' ? (
        <button
          type="button"
          onClick={recordingDisabled ? undefined : startRecording}
          disabled={recordingDisabled}
          className={
            recordingDisabled
              ? 'flex h-full min-h-[5.5rem] w-full cursor-not-allowed flex-col items-center justify-center gap-1 rounded-xl border-2 border-[var(--c-text)]/20 px-1 py-2 font-bold text-[var(--c-text)]/35'
              : 'flex h-full min-h-[5.5rem] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-[var(--c-primary)] px-1 py-2 font-bold text-[var(--c-primary)] transition-all hover:bg-[var(--c-primary)] hover:text-[var(--c-muted)]'
          }
          aria-label={dict.startRecording}
          aria-disabled={recordingDisabled || undefined}
          title={recordingDisabled ? dict.inAppBrowserRecordingHint : dict.tooltipRecord}
        >
          <MdMic className="h-8 w-8 shrink-0" aria-hidden />
          <span className="text-center text-xs leading-tight">{dict.startRecording}</span>
        </button>
      ) : isRecording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="flex h-full min-h-[5.5rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-red-500 bg-red-500/10 px-1 py-2 font-bold text-red-600 dark:text-red-400 transition-all hover:bg-red-500/20"
          aria-label={dict.stopRecording}
        >
          <MdStop className="h-7 w-7 shrink-0" aria-hidden />
          <span className="text-center text-[10px] leading-tight">{dict.stopRecording}</span>
          <span className="tabular-nums text-[10px] leading-none opacity-90">
            {formatClock(elapsedMs)}
          </span>
          <span className="tabular-nums text-[10px] leading-none opacity-60">
            / {formatClock(MAX_MS)}
          </span>
          <div
            className="mt-1 flex h-3 items-end gap-0.5"
            role="meter"
            aria-label={dict.inputLevelLabel}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.round(inputLevel * 100)}
          >
            {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((threshold) => (
              <span
                key={threshold}
                className={`w-1 rounded-sm transition-colors ${
                  inputLevel >= threshold ? 'bg-red-500' : 'bg-red-500/20'
                }`}
                style={{ height: `${4 + threshold * 8}px` }}
                aria-hidden
              />
            ))}
          </div>
        </button>
      ) : (
        <button
          type="button"
          disabled
          aria-label={dict.stoppingRecording}
          aria-busy="true"
          className="flex h-full min-h-[5.5rem] w-full cursor-wait flex-col items-center justify-center gap-1 rounded-xl border-2 border-[var(--c-primary)]/45 bg-[var(--c-primary)]/10 px-1 py-2 font-bold text-[var(--c-primary)] opacity-80"
        >
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--c-primary)]/30 border-t-[var(--c-primary)]"
            aria-hidden
          />
          <span className="text-center text-[10px] leading-tight">{dict.stoppingRecording}</span>
        </button>
      )}
    </>
  );
}
