export default function GuidePage({ dict, onBack }) {
  return (
    <div className="relative z-20 w-full min-h-screen flex flex-col items-center px-6 pt-28 pb-16">
      <div className="w-full max-w-2xl animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[var(--c-text)] mb-2">
            {dict.guideTitle}
          </h1>
          <p className="text-base md:text-lg text-[var(--c-text)]/65">{dict.guideSubtitle}</p>
        </div>

        <div className="space-y-6">
          <section className="bg-[var(--c-card)]/82 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.10)] border border-[var(--c-text)]/5">
            <h2 className="text-xl font-black text-[var(--c-primary)] mb-4">{dict.guideUsageTitle}</h2>
            <ol className="list-decimal pl-5 space-y-3 text-sm md:text-base text-[var(--c-text)]/85 leading-relaxed">
              {dict.guideUsageSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="bg-[var(--c-card)]/82 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.10)] border border-[var(--c-text)]/5">
            <h2 className="text-xl font-black text-[var(--c-primary)] mb-4">
              {dict.guideModelsTitle}
            </h2>
            <div className="space-y-4">
              {dict.guideModels.map((model) => (
                <article
                  key={model.name}
                  className="rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/50 p-4"
                >
                  <h3 className="font-black text-[var(--c-text)]">{model.name}</h3>
                  <p className="mt-1 text-sm text-[var(--c-text)]/75 leading-relaxed">
                    {model.citation}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="bg-[var(--c-card)]/82 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.10)] border border-[var(--c-text)]/5">
            <h2 className="text-xl font-black text-[var(--c-primary)] mb-3">
              {dict.guideDisclaimerTitle}
            </h2>
            <p className="text-sm md:text-base text-[var(--c-text)]/80 leading-relaxed whitespace-pre-line">
              {dict.guideDisclaimerBody}
            </p>
          </section>
        </div>

        <div className="text-center mt-10">
          <button
            type="button"
            onClick={onBack}
            className="px-8 py-3 rounded-xl bg-[var(--c-primary)] text-[var(--c-bg)] font-black shadow-lg hover:brightness-110 transition-all"
          >
            {dict.guideBackBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
