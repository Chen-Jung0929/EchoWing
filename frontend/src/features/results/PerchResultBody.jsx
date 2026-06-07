import { DEFAULT_CONFIDENCE_THRESHOLD } from '../../config/confidenceThreshold';
import ChunkVisualizerSection from '../../utils/ChunkVisualizerSection';
import SpeciesResultsSection from '../../utils/SpeciesResultsSection';
import { modelWindowSec } from '../../utils/aggregateByVote';
import { getLocalizedText } from '../../i18n/getLocalizedText';

export default function PerchResultBody({
  chunk,
  dict,
  lang,
  isOverview = true,
  backendError,
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
  spectrogramByIndex = {},
  resultChunks = [],
  totalDurationSec = 0,
  xaiPending = false,
  speciesVariant = 'timeline',
  selectionLabel = '',
  hideSpectrogram = false,
}) {
  const windowSec = modelWindowSec(resultChunks?.[0]?.model_name ?? chunk?.model_name);

  return (
    <>
      {selectionLabel ? (
        <p className="text-xs text-center text-[var(--c-text)]/55 mb-4 font-bold">
          {selectionLabel}
        </p>
      ) : null}

      <div className="flex flex-col gap-6">
        <section className="bg-[var(--c-bg)]/72 rounded-2xl p-6">
          <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
            {dict.topSpecies}
          </h3>
          <SpeciesResultsSection
            predictions={chunk?.predictions}
            confidenceThreshold={confidenceThreshold}
            dict={dict}
            lang={lang}
            isSummary={false}
            variant={speciesVariant}
            getLocalizedText={getLocalizedText}
            previewCount={5}
            windowSec={windowSec}
          />
        </section>
      </div>

      {!hideSpectrogram ? (
        <ChunkVisualizerSection
          chunk={chunk}
          isSummary={isOverview}
          resultChunks={resultChunks}
          spectrogramCache={spectrogramByIndex}
          dict={dict}
          lang={lang}
          totalDurationSec={totalDurationSec > 0 ? totalDurationSec : 0}
          xaiPending={xaiPending}
        />
      ) : null}

      <section className="mt-6 bg-[var(--c-bg)]/72 rounded-2xl p-6">
        <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
          {dict.decisionSupportTitle}
        </h3>
        <div className="space-y-4 text-[var(--c-text)]/80 leading-relaxed">
          <div>
            <p className="font-black text-[var(--c-text)] mb-1">{dict.riskAnalysis}</p>
            <p>{getLocalizedText(chunk?.decision_support?.risk_analysis, lang)}</p>
          </div>
          <div>
            <p className="font-black text-[var(--c-text)] mb-1">
              {dict.actionRecommendation}
            </p>
            <p>
              {getLocalizedText(
                chunk?.decision_support?.action_recommendation,
                lang
              )}
            </p>
          </div>
          <div>
            <p className="font-black text-[var(--c-text)] mb-1">{dict.disclaimer}</p>
            <p className="text-sm text-[var(--c-text)]/50 border-t border-[var(--c-text)]/10 pt-4">
              {getLocalizedText(chunk?.decision_support?.disclaimer, lang)}
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
