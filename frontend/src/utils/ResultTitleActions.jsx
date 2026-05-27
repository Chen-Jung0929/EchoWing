import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdSave, MdDownload, MdDownloadDone } from 'react-icons/md';

const FAB_BG = {
  backgroundImage: "url('/icon_bg.png')",
  backgroundSize: '135% 135%',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};
const FAB_BTN =
  'relative flex shrink-0 items-center justify-center rounded-full border border-[var(--c-text)]/10 shadow-md transition-transform focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--c-primary)] enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40';

const FAB_ICON_COLOR = '#000000';
const FAB_ICON_SIZE = 20;
const DONE_MS = 3000;

function SaveTextButton({ label, labelDone, onSave, saved }) {
  const [flashDone, setFlashDone] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!saved) return undefined;
    setFlashDone(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFlashDone(false);
      timerRef.current = null;
    }, DONE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [saved]);

  const showDone = saved && flashDone;

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={!onSave}
      aria-label={showDone ? labelDone : label}
      className={`${FAB_BTN} h-12 w-12`}
      style={FAB_BG}
    >
      <MdSave color={FAB_ICON_COLOR} size={FAB_ICON_SIZE} aria-hidden />
    </button>
  );
}

function DownloadButton({ ariaLabel, ariaLabelDone, onDownload }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const doneTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, []);

  const handleClick = async () => {
    if (!onDownload || busy || done) return;
    setBusy(true);
    try {
      await onDownload();
      setDone(true);
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
      doneTimerRef.current = setTimeout(() => {
        setDone(false);
        doneTimerRef.current = null;
      }, DONE_MS);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('[Download]', err);
      }
    } finally {
      setBusy(false);
    }
  };

  const Icon = done ? MdDownloadDone : MdDownload;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!onDownload || busy}
      aria-label={done ? ariaLabelDone : ariaLabel}
      className={`${FAB_BTN} h-12 w-12`}
      style={FAB_BG}
    >
      <Icon color={FAB_ICON_COLOR} size={FAB_ICON_SIZE} aria-hidden />
    </button>
  );
}

export function ResultFloatingActions({ dict, onSave, onDownload, surveySaved }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed bottom-6 right-6 z-[200] flex shrink-0 items-center gap-3"
      role="group"
      aria-label={dict.resultTitle}
    >
      <SaveTextButton
        label={dict.saveResult}
        labelDone={dict.saveDone}
        onSave={onSave}
        saved={surveySaved}
      />
      <DownloadButton
        ariaLabel={dict.downloadResult}
        ariaLabelDone={dict.downloadDone}
        onDownload={onDownload}
      />
    </div>,
    document.body
  );
}

export function ResultTitleBar({ dict, onSave, onDownload, surveySaved }) {
  return (
    <>
      <h2 className="text-center min-w-0 truncate text-2xl font-black tracking-tight text-[var(--c-text)] md:text-3xl">
        {dict.resultTitle}
      </h2>
      <ResultFloatingActions
        dict={dict}
        onSave={onSave}
        onDownload={onDownload}
        surveySaved={surveySaved}
      />
    </>
  );
}
