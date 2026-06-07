import { createPortal } from 'react-dom';
import { MdPrivacyTip } from 'react-icons/md';

export default function PrivacyNotice({ open, dict, onAccept, onOpenPrivacy }) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <aside
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[280] mx-auto max-w-xl rounded-2xl border border-[var(--c-text)]/15 bg-[var(--c-card)]/95 p-4 shadow-2xl backdrop-blur-md"
      role="dialog"
      aria-labelledby="privacy-notice-title"
    >
      <div className="flex items-start gap-3">
        <MdPrivacyTip className="mt-0.5 h-6 w-6 shrink-0 text-[var(--c-primary)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="privacy-notice-title" className="font-black text-[var(--c-text)]">
            {dict.privacyNoticeTitle}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--c-text)]/75">
            {dict.privacyNoticeSummary}
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="rounded-xl px-3 py-2 text-sm font-bold text-[var(--c-primary)] underline decoration-dotted underline-offset-4"
            >
              {dict.privacyNoticeLearnMore}
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="rounded-xl bg-[var(--c-primary)] px-4 py-2 text-sm font-black text-[var(--c-bg)] shadow-md hover:brightness-110"
            >
              {dict.privacyNoticeAccept}
            </button>
          </div>
        </div>
      </div>
    </aside>,
    document.body
  );
}
