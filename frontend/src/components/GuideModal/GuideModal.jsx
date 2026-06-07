import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdOpenInNew, MdPrivacyTip } from 'react-icons/md';
import { getGuideModelLogo } from '../../config/modelLogos';


export default function GuideModal({
  open,
  dict,
  onClose,
  initialSection = 'usage',
  onReopenPrivacy,
}) {
  const titleId = useId();
  const [section, setSection] = useState(initialSection);

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

        <div
          className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--c-text)]/8 px-4 py-3"
          role="tablist"
          aria-label={dict.guideTitle}
        >
          {Object.keys(dict.guideTabs ?? {}).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={section === key}
              onClick={() => setSection(key)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-black transition-colors ${
                section === key
                  ? 'bg-[var(--c-primary)] text-[var(--c-bg)]'
                  : 'bg-[var(--c-bg)]/65 text-[var(--c-text)]/65 hover:text-[var(--c-text)]'
              }`}
            >
              {dict.guideTabs[key]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {section === 'usage' ? (
            <section className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/50 p-5">
            <h3 className="text-base font-black text-[var(--c-primary)] mb-3">
              {dict.guideUsageTitle}
            </h3>
            <ol className="list-decimal pl-5 space-y-2.5 text-sm text-[var(--c-text)]/85 leading-relaxed">
              {(Array.isArray(dict?.guideUsageSteps) ? dict.guideUsageSteps : []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          ) : null}

          {section === 'models' ? (
            <section className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/50 p-5">
            <h3 className="text-base font-black text-[var(--c-primary)] mb-3">
              {dict.guideModelsTitle}
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-[var(--c-text)]/70">
              {dict.guideModelsComparison}
            </p>
            <div className="space-y-3">
              {(Array.isArray(dict?.guideModels) ? dict.guideModels : []).map((model, index) => {
                const logo = getGuideModelLogo(index);
                return (
                <article
                  key={model?.name || index}
                  className="relative overflow-hidden rounded-xl border border-[var(--c-text)]/10 bg-[var(--c-card)]/60 p-4"
                >
                  {logo ? (
                    <>
                      <img
                        src={logo.src}
                        alt=""
                        aria-hidden
                        className={`pointer-events-none absolute select-none object-contain opacity-[0.50] ${
                          logo.wide
                            ? 'right-2 top-1/2 h-[55%] max-w-[48%] -translate-y-1/2'
                            : 'right-3 top-1/2 h-[78%] max-w-[38%] -translate-y-1/2'
                        }`}
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--c-card)] via-[var(--c-card)]/88 to-transparent"
                        aria-hidden
                      />
                    </>
                  ) : null}
                  <div className="relative z-10 min-w-0">
                  <h4 className="font-black text-[var(--c-text)]">{model.name}</h4>
                  <dl className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="font-bold text-[var(--c-text)]">{dict.guideModelWindow}</dt>
                      <dd className="text-[var(--c-text)]/65">{model.window}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-[var(--c-text)]">{dict.guideModelType}</dt>
                      <dd className="text-[var(--c-text)]/65">{model.type}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-[var(--c-text)]">{dict.guideModelSource}</dt>
                      <dd className="text-[var(--c-text)]/65">{model.source}</dd>
                    </div>
                  </dl>
                  <p className="mt-1 text-sm text-[var(--c-text)]/75 leading-relaxed">
                    {model.citation}
                  </p>
                  {model.link ? (
                    <a
                      href={model.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[var(--c-primary)] underline decoration-dotted underline-offset-4"
                    >
                      {dict.guideModelExternalLink}
                      <MdOpenInNew aria-hidden />
                    </a>
                  ) : null}
                  </div>
                </article>
              );
              })}
            </div>
          </section>
          ) : null}

          {section === 'how' ? (
            <section className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/50 p-5">
              <h3 className="text-base font-black text-[var(--c-primary)] mb-3">
                {dict.guideHowTitle}
              </h3>
              <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-[var(--c-text)]/85">
                {(Array.isArray(dict?.guideHowSteps) ? dict.guideHowSteps : []).map((step) => <li key={step}>{step}</li>)}
              </ol>
            </section>
          ) : null}

          {section === 'privacy' ? (
            <section className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/50 p-5">
              <h3 className="flex items-center gap-2 text-base font-black text-[var(--c-primary)] mb-3">
                <MdPrivacyTip aria-hidden />
                {dict.guidePrivacyTitle}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--c-text)]/80">
                {dict.guidePrivacyBody}
              </p>
              <h4 className="mt-5 font-black text-[var(--c-text)]">{dict.guideDisclaimerTitle}</h4>
              <p className="mt-1 text-sm leading-relaxed text-[var(--c-text)]/70">
                {dict.guideDisclaimerBody}
              </p>
              <button
                type="button"
                onClick={onReopenPrivacy}
                className="mt-4 rounded-xl border border-[var(--c-primary)]/35 px-3 py-2 text-sm font-black text-[var(--c-primary)] hover:bg-[var(--c-primary)]/10"
              >
                {dict.privacyNoticeReopen}
              </button>
            </section>
          ) : null}

          {section === 'credits' ? (
            <section className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/50 p-5">
            <h3 className="text-base font-black text-[var(--c-primary)] mb-2">
              {dict.guideCreditsTitle}
            </h3>
            <p className="text-sm text-[var(--c-text)]/80 leading-relaxed whitespace-pre-line">
              {dict.guideCreditsBody}
            </p>
          </section>
          ) : null}
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
