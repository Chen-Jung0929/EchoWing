import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdSave, MdDownload, MdShare, MdClose, MdMoreHoriz, MdPlace } from 'react-icons/md';
import ShareResultMenu from './ShareResultMenu';

const FAB_BG = {
  backgroundImage: "url('/icon_bg.png')",
  backgroundSize: '135% 135%',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};
const FAB_BTN =
  'relative flex shrink-0 items-center justify-center rounded-full border border-[var(--c-text)]/10 shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--c-primary)] enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40';

const FAB_ICON_COLOR = '#000000';
const FAB_ICON_SIZE = 20;
const DONE_MS = 3000;

function ActionRow({ label, children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="max-w-48 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 text-right text-xs font-bold text-white shadow-md backdrop-blur-sm">
        {label}
      </span>
      {children}
    </div>
  );
}

function SaveTextButton({ label, labelDone, onSave, saved, className = '' }) {
  const [flashDone, setFlashDone] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!saved) return undefined;
    const t1 = setTimeout(() => setFlashDone(true), 0);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFlashDone(false);
      timerRef.current = null;
    }, DONE_MS);
    return () => {
      clearTimeout(t1);
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
      className={`${FAB_BTN} h-12 w-12 ${className}`}
      style={FAB_BG}
    >
      <MdSave color={FAB_ICON_COLOR} size={FAB_ICON_SIZE} aria-hidden />
    </button>
  );
}

function DownloadButton({ ariaLabel, onDownload, className = '' }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!onDownload || busy) return;
    setBusy(true);
    try {
      await onDownload();
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('[Download PDF]', err);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!onDownload || busy}
      aria-label={ariaLabel}
      className={`${FAB_BTN} h-12 w-12 ${className}`}
      style={FAB_BG}
    >
      <MdDownload color={FAB_ICON_COLOR} size={FAB_ICON_SIZE} aria-hidden />
    </button>
  );
}

function ShareFabButton({ ariaLabel, onClick, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${FAB_BTN} h-12 w-12 ${className}`}
      style={FAB_BG}
    >
      <MdShare color={FAB_ICON_COLOR} size={FAB_ICON_SIZE} aria-hidden />
    </button>
  );
}

export function ResultFloatingActions({
  dict,
  onSave,
  onDownload,
  getSharePayload,
  surveySaved,
  actionsDisabled = false,
  onNearbyRecords,
  nearbyEnabled = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  useEffect(() => {
    if (!actionsDisabled) return undefined;
    const t = setTimeout(() => {
      setShareOpen(false);
      setMenuOpen(false);
    }, 0);
    return () => clearTimeout(t);
  }, [actionsDisabled]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShareOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[190] cursor-default"
          aria-label={dict.shareModalClose}
          onClick={() => {
            setShareOpen(false);
            setMenuOpen(false);
          }}
        />
      ) : null}

      <div
        className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse items-center gap-3"
        role="group"
        aria-label={dict.resultTitle}
      >
        <button
          type="button"
          disabled={actionsDisabled}
          onClick={() => {
            if (actionsDisabled) return;
            setShareOpen(false);
            setMenuOpen((open) => !open);
          }}
          aria-expanded={menuOpen}
          aria-disabled={actionsDisabled}
          aria-label={
            actionsDisabled
              ? dict.xaiGeneratingHint
              : menuOpen
                ? dict.actionsMenuClose
                : dict.actionsMenuOpen
          }
          className={`${FAB_BTN} h-14 w-14`}
          style={FAB_BG}
        >
          {menuOpen ? (
            <MdClose color={FAB_ICON_COLOR} size={24} aria-hidden />
          ) : (
            <MdMoreHoriz color={FAB_ICON_COLOR} size={24} aria-hidden />
          )}
        </button>

        {menuOpen ? (
          <>
            <ActionRow label={dict.shareResult}>
              <ShareFabButton
                ariaLabel={dict.shareResult}
                disabled={!getSharePayload}
                onClick={() => setShareOpen(true)}
              />
            </ActionRow>
            <ActionRow label={dict.saveFieldNotesLabel}>
              <SaveTextButton
                label={dict.saveFieldNotesLabel}
                labelDone={dict.saveDone}
                onSave={onSave}
                saved={surveySaved}
              />
            </ActionRow>
            {nearbyEnabled ? (
              <ActionRow label={dict.nearbyRecordsLabel}>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onNearbyRecords?.();
                  }}
                  aria-label={dict.nearbyRecordsLabel}
                  className={`${FAB_BTN} h-12 w-12`}
                  style={FAB_BG}
                >
                  <MdPlace color={FAB_ICON_COLOR} size={FAB_ICON_SIZE} aria-hidden />
                </button>
              </ActionRow>
            ) : null}
            <ActionRow label={dict.downloadResult}>
              <DownloadButton ariaLabel={dict.downloadResult} onDownload={onDownload} />
            </ActionRow>
          </>
        ) : null}
      </div>

      <ShareResultMenu
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        getSharePayload={getSharePayload}
        dict={dict}
      />
    </>,
    document.body
  );
}

export function ResultTitleBar({
  dict,
  onSave,
  onDownload,
  getSharePayload,
  surveySaved,
  actionsDisabled = false,
  onNearbyRecords,
  nearbyEnabled = false,
}) {
  return (
    <>
      <h2 className="text-center min-w-0 truncate text-2xl font-black tracking-tight text-[var(--c-text)] md:text-3xl">
        {dict.resultTitle}
      </h2>
      {actionsDisabled ? (
        <p className="mt-2 text-center text-xs text-[var(--c-text)]/50">
          {dict.xaiGeneratingHint}
        </p>
      ) : null}
      <ResultFloatingActions
        dict={dict}
        onSave={onSave}
        onDownload={onDownload}
        getSharePayload={getSharePayload}
        surveySaved={surveySaved}
        actionsDisabled={actionsDisabled}
        onNearbyRecords={onNearbyRecords}
        nearbyEnabled={nearbyEnabled}
      />
    </>
  );
}
