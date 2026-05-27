import ChunkVisualizerSection from '../../utils/ChunkVisualizerSection';
import TopClassesSegmentSection from '../../utils/TopClassesSegmentSection';
import SpeciesResultsSection from '../../utils/SpeciesResultsSection';
import { getLocalizedText } from '../../i18n/getLocalizedText';

export default function PerchResultBody({
  chunk,
  dict,
  lang,
  isSummary = false,
  backendError,
  confidenceThreshold = 0.8,
  spectrogramByIndex = {},
  resultChunks = [],
}) {
  return (
    <>
      <div className="flex flex-col gap-6">
        <TopClassesSegmentSection
          items={chunk.predictions?.top_classes}
          getLocalizedText={getLocalizedText}
          lang={lang}
          dict={dict}
        />

        <section className="bg-[var(--c-bg)]/72 rounded-2xl p-6">
          <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
            {dict.topSpecies}
          </h3>
          <SpeciesResultsSection
            predictions={chunk.predictions}
            confidenceThreshold={confidenceThreshold}
            dict={dict}
            lang={lang}
            isSummary={isSummary}
            getLocalizedText={getLocalizedText}
            previewCount={5}
          />
        </section>
      </div>

      <ChunkVisualizerSection
        chunk={chunk}
        isSummary={isSummary}
        resultChunks={resultChunks}
        spectrogramCache={spectrogramByIndex}
        dict={dict}
        lang={lang}
      />

      <section className="mt-6 bg-[var(--c-bg)]/72 rounded-2xl p-6">
        <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
          {dict.decisionSupport}
        </h3>
        <div className="space-y-4 text-[var(--c-text)]/80 leading-relaxed">
          <div>
            <p className="font-black text-[var(--c-text)] mb-1">{dict.riskAnalysis}</p>
            <p>{getLocalizedText(chunk.decision_support?.risk_analysis, lang)}</p>
          </div>
          <div>
            <p className="font-black text-[var(--c-text)] mb-1">
              {dict.actionRecommendation}
            </p>
            <p>
              {getLocalizedText(
                chunk.decision_support?.action_recommendation,
                lang
              )}
            </p>
          </div>
          <div>
            <p className="font-black text-[var(--c-text)] mb-1">{dict.disclaimer}</p>
            <p className="text-sm text-[var(--c-text)]/50 border-t border-[var(--c-text)]/10 pt-4">
              {getLocalizedText(chunk.decision_support?.disclaimer, lang)}
            </p>
          </div>
          {backendError ? (
            <div className="text-xs text-[var(--c-text)]/40 border-t border-[var(--c-text)]/10 pt-4">
              <span className="font-bold">{dict.backendError}: </span>
              {backendError}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
