import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MdSave, MdDownload, MdDownloadDone } from 'react-icons/md';

/** 儲存功能暫停，按鈕保留 UI */
const SAVE_ENABLED = false;

const FAB_BG = {
  backgroundImage: "url('/icon_bg.png')",
  backgroundSize: '135% 135%',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};
const FAB_BTN =
  'relative flex shrink-0 items-center justify-center rounded-full border border-[var(--c-text)]/10 shadow-md transition-transform focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--c-primary)] enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40';

/** react-icons 使用 fill=currentColor；Tailwind 預設色已重置，需直接指定 SVG 顏色 */
const FAB_ICON_COLOR = '#000000';
const FAB_ICON_SIZE = 20;

function SaveTextButton({ label }) {
  return (
    <button
      type="button"
      disabled={!SAVE_ENABLED}
      aria-label={label}
      aria-disabled={!SAVE_ENABLED}
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

  const handleClick = async () => {
    if (!onDownload || busy || done) return;
    setBusy(true);
    try {
      await onDownload();
      setDone(true);
    } catch (err) {
      console.error('[Download]', err);
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

/** 固定於整個視窗右下角的儲存／下載（Portal 至 body，不受 header sticky 影響） */
export function ResultFloatingActions({ dict, onDownload }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed bottom-6 right-6 z-[200] flex shrink-0 items-center gap-3"
      role="group"
      aria-label={dict.resultTitle}
    >
      <SaveTextButton label={dict.saveResult} />
      <DownloadButton
        ariaLabel={dict.downloadResult}
        ariaLabelDone={dict.downloadDone}
        onDownload={onDownload}
      />
    </div>,
    document.body
  );
}

/** 預測結果標題 */
export function ResultTitleBar({ dict, onDownload }) {
  return (
    <>
      <h2 className="text-center min-w-0 truncate text-2xl font-black tracking-tight text-[var(--c-text)] md:text-3xl">
        {dict.resultTitle}
      </h2>
      <ResultFloatingActions dict={dict} onDownload={onDownload} />
    </>
  );
}
