import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';

export default function GuideModal({ open, dict, onClose }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--c-text)]/10 bg-[var(--c-card)] shadow-[0_16px_48px_rgb(0,0,0,0.22)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--c-text)]/8 px-6 py-4 shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-black text-[var(--c-text)]">
              {dict.guideTitle}
            </h2>
            <p className="mt-1 text-xs text-[var(--c-text)]/55">{dict.guideSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--c-text)]/70 transition-colors hover:bg-[var(--c-bg)]/80"
            aria-label={dict.guideModalClose}
          >
            <MdClose className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <section className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/50 p-5">
            <h3 className="text-base font-black text-[var(--c-primary)] mb-3">
              {dict.guideUsageTitle}
            </h3>
            <ol className="list-decimal pl-5 space-y-2.5 text-sm text-[var(--c-text)]/85 leading-relaxed">
              {dict.guideUsageSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/50 p-5">
            <h3 className="text-base font-black text-[var(--c-primary)] mb-3">
              {dict.guideModelsTitle}
            </h3>
            <div className="space-y-3">
              {dict.guideModels.map((model) => (
                <article
                  key={model.name}
                  className="rounded-xl border border-[var(--c-text)]/10 bg-[var(--c-card)]/60 p-4"
                >
                  <h4 className="font-black text-[var(--c-text)]">{model.name}</h4>
                  <p className="mt-1 text-sm text-[var(--c-text)]/75 leading-relaxed">
                    {model.citation}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/50 p-5">
            <h3 className="text-base font-black text-[var(--c-primary)] mb-2">
              {dict.guideDisclaimerTitle}
            </h3>
            <p className="text-sm text-[var(--c-text)]/80 leading-relaxed whitespace-pre-line">
              {dict.guideDisclaimerBody}
            </p>
          </section>
        </div>

        <div className="shrink-0 border-t border-[var(--c-text)]/8 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[var(--c-primary)] px-6 py-2.5 text-sm font-black text-[var(--c-bg)] shadow-md transition-all hover:brightness-110"
          >
            {dict.guideModalClose}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
