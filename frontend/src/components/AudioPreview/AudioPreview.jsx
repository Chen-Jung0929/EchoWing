import { useEffect, useMemo, useState } from 'react';
import { MdClose, MdDownload, MdRefresh } from 'react-icons/md';
import { formatMessage } from '../../i18n';
import { MAX_AUDIO_DURATION_SEC, MIN_AUDIO_DURATION_SEC } from '../../utils/audioDuration';

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  return `${seconds.toFixed(1)} s`;
}

export default function AudioPreview({
  file,
  metadata,
  recorded = false,
  dict,
  onClear,
  onReplace,
  onDownload,
}) {
  const [url] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  const durationState = useMemo(() => {
    if (metadata.status === 'decoding') return { tone: 'muted', text: dict.audioDurationDetecting };
    if (metadata.status === 'unavailable') return { tone: 'warning', text: dict.audioDurationUnavailable };
    if (metadata.duration < MIN_AUDIO_DURATION_SEC) return { tone: 'error', text: dict.fileTooShort };
    if (metadata.duration > MAX_AUDIO_DURATION_SEC + 0.5) return { tone: 'error', text: dict.fileTooLong };
    return { tone: 'success', text: dict.audioDurationValid };
  }, [dict, metadata]);

  const toneClass = {
    muted: 'text-[var(--c-text)]/55',
    warning: 'text-amber-700 dark:text-amber-300',
    error: 'text-red-600 dark:text-red-400',
    success: 'text-emerald-700 dark:text-emerald-300',
  }[durationState.tone];

  return (
    <section
      className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/72 p-4"
      aria-label={dict.audioPreviewTitle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--c-primary)]">
            {dict.audioPreviewTitle}
          </p>
          <p className="mt-1 break-all text-sm font-bold text-[var(--c-text)]">
            {recorded ? dict.recordedAudio : file.name}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {recorded ? (
            <button
              type="button"
              onClick={onDownload}
              className="rounded-lg p-2 text-[var(--c-text)]/65 hover:bg-[var(--c-card)] focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]"
              aria-label={dict.downloadRecording}
              title={dict.downloadRecording}
            >
              <MdDownload aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onReplace}
            className="rounded-lg p-2 text-[var(--c-text)]/65 hover:bg-[var(--c-card)] focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]"
            aria-label={dict.replaceAudio}
            title={dict.replaceAudio}
          >
            <MdRefresh aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg p-2 text-[var(--c-text)]/65 hover:bg-[var(--c-card)] focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]"
            aria-label={dict.clearSelectedFile}
            title={dict.clearSelectedFile}
          >
            <MdClose aria-hidden />
          </button>
        </div>
      </div>

      <audio
        className="mt-3 w-full"
        controls
        preload="metadata"
        src={url}
        aria-label={dict.audioPlaybackLabel}
      />

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-[var(--c-text)]/50">{dict.audioDurationLabel}</dt>
          <dd className="font-bold text-[var(--c-text)]">{formatDuration(metadata.duration)}</dd>
        </div>
        <div>
          <dt className="text-[var(--c-text)]/50">{dict.audioSizeLabel}</dt>
          <dd className="font-bold text-[var(--c-text)]">{formatBytes(file.size)}</dd>
        </div>
        <div>
          <dt className="text-[var(--c-text)]/50">{dict.audioFormatLabel}</dt>
          <dd className="break-all font-bold text-[var(--c-text)]">{file.type || dict.audioFormatUnknown}</dd>
        </div>
        <div>
          <dt className="text-[var(--c-text)]/50">{dict.audioFormatStatusLabel}</dt>
          <dd className="font-bold text-emerald-700 dark:text-emerald-300">{dict.audioFormatAccepted}</dd>
        </div>
      </dl>

      <p className={`mt-3 text-xs font-bold ${toneClass}`} role={durationState.tone === 'error' ? 'alert' : 'status'}>
        {durationState.text}
      </p>
      <p className="mt-1 text-[11px] text-[var(--c-text)]/50">
        {formatMessage(dict.audioDurationReminder, {
          min: MIN_AUDIO_DURATION_SEC,
          max: MAX_AUDIO_DURATION_SEC,
        })}
      </p>
    </section>
  );
}
