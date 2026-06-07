import React, { useEffect } from 'react';
import usePageMeta from '../../hooks/usePageMeta';
import { Link } from 'react-router-dom';
import './XaiEducationPage.css';
import { MathBlock } from './math/MathBlock.jsx';
import { AudioToSpectrogramAnimation } from './animations/AudioToSpectrogramAnimation.jsx';
import { SlidingWindowAnimation } from './animations/SlidingWindowAnimation.jsx';
import { DeconvolutionAnimation } from './animations/DeconvolutionAnimation.jsx';
import { OcclusionXaiAnimation } from './animations/OcclusionXaiAnimation.jsx';
import { xaiSections } from './content/xaiEducationContent.js';

const ANIMATED_SECTION_TYPES = new Set([
  'spectrogram',
  'slidingWindow',
  'deconvolution',
  'occlusion',
]);

function AnimationSlot({ type, dict }) {
  switch (type) {
    case 'spectrogram':
      return <AudioToSpectrogramAnimation dict={dict} />;
    case 'slidingWindow':
      return <SlidingWindowAnimation dict={dict} />;
    case 'deconvolution':
      return <DeconvolutionAnimation dict={dict} />;
    case 'occlusion':
      return <OcclusionXaiAnimation dict={dict} />;
    default:
      return null;
  }
}

export default function XaiEducationPage({ dict }) {
  const xaiDict = dict.xaiEducation || {};
  usePageMeta(xaiDict.navLabel, xaiDict.subtitle, dict.pageMetaTitleSuffix);
  const sections = Array.isArray(xaiDict.sections) ? xaiDict.sections : [];

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'xai-structured-data';
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": xaiDict.title,
      "description": xaiDict.subtitle,
      "url": "https://echo-wing.vercel.app/how-it-works",
      "author": { "@type": "Organization", "name": "EchoWing Team" },
      "inLanguage": document.documentElement.lang,
      "isPartOf": { "@type": "WebApplication", "name": "EchoWing" }
    });
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById('xai-structured-data');
      if (el) el.remove();
    };
  }, [xaiDict.title, xaiDict.subtitle]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="xai-page min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] pt-24 pb-32">
      <div className="max-w-4xl mx-auto px-6">
        
        <div className="mb-8">
          <Link
            to="/"
            className="text-sm font-bold text-[var(--c-primary)] hover:text-[var(--c-text)] transition-colors flex items-center gap-2 no-underline"
          >
            <span aria-hidden="true">←</span> {xaiDict.backToHome}
          </Link>
        </div>

        <header className="xai-hero mb-16 text-center">
          <p className="text-[var(--c-primary)] font-bold tracking-widest uppercase text-sm mb-4">
            {xaiDict.eyebrow}
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 leading-tight">
            {xaiDict.title}
          </h1>
          <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto leading-relaxed">
            {xaiDict.subtitle}
          </p>
        </header>

        <nav className="xai-section-nav flex flex-wrap justify-center gap-2 mb-16" aria-label={xaiDict.sectionNavLabel}>
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#xai-${section.id}`}
              className="px-4 py-2 rounded-full border border-[var(--c-text)]/10 text-sm font-bold hover:bg-[var(--c-primary)] hover:text-white hover:border-[var(--c-primary)] transition-colors"
            >
              {section.navLabel}
            </a>
          ))}
        </nav>

        <section className="xai-flow-strip flex flex-wrap items-center justify-center gap-3 mb-20 p-6 rounded-3xl bg-[var(--c-card)] border border-[var(--c-text)]/5 shadow-sm" aria-label={xaiDict.flowLabel}>
          {(xaiDict.flowSteps || []).map((step, index) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center gap-2 px-2 text-center">
                <span className="text-2xl drop-shadow-sm" aria-hidden="true">{step.icon}</span>
                <span className="text-xs font-bold tracking-wide opacity-80">{step.label}</span>
              </div>
              {index < (xaiDict.flowSteps?.length || 0) - 1 ? (
                <span className="text-[var(--c-text)]/20" aria-hidden="true">→</span>
              ) : null}
            </React.Fragment>
          ))}
        </section>

        <div className="xai-section-stack flex flex-col gap-12 md:gap-24">
          {sections.map((section) => {
            const contentMeta = xaiSections.find(s => s.id === section.id) || {};
            const hasVisual = ANIMATED_SECTION_TYPES.has(contentMeta.animation);

            return (
              <article
                key={section.id}
                id={`xai-${section.id}`}
                className={`xai-section-card flex flex-col gap-8${hasVisual ? ' md:flex-row md:gap-16 md:items-center' : ''}`}
              >
                <div className={`xai-section-copy w-full${hasVisual ? ' md:flex-1' : ''}`}>
                  <p className="text-[var(--c-primary)] font-bold tracking-widest uppercase text-xs mb-3">
                    {section.kicker}
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-snug">
                    {section.title}
                  </h2>
                  <div className="space-y-4 text-[var(--c-text)]/80 leading-relaxed mb-6">
                    {section.paragraphs.map((text, idx) => (
                      <p key={idx}>{text}</p>
                    ))}
                  </div>

                  {contentMeta.formula ? (
                    <div className="my-8 p-6 bg-[var(--c-card)] rounded-2xl border border-[var(--c-text)]/5 shadow-sm overflow-x-auto">
                      <MathBlock label={section.formulaCaption}>
                        {contentMeta.formula}
                      </MathBlock>
                    </div>
                  ) : null}

                  {section.takeaway ? (
                    <div className="mt-8 p-5 rounded-2xl bg-[var(--c-accent)]/10 border border-[var(--c-accent)]/20 flex gap-4 items-start">
                      <span className="text-[var(--c-accent)] text-xl leading-none">💡</span>
                      <p className="text-sm font-medium leading-relaxed">
                        <strong className="text-[var(--c-accent)] block mb-1">{xaiDict.takeawayLabel}</strong>
                        {section.takeaway}
                      </p>
                    </div>
                  ) : null}
                </div>

                {hasVisual ? (
                  <div className="xai-section-visual w-full md:w-5/12 shrink-0">
                    <AnimationSlot type={contentMeta.animation} dict={dict} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
