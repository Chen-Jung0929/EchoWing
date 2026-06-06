import { ResultTitleBar } from '../../utils/ResultTitleActions';
import { isBackendPredictResponse } from './isBackendPredictResponse';
import BackendResultPanel from './BackendResultPanel';
import PerchResultBody from './PerchResultBody';

export default function ResultPanel({
  predictionResult,
  dict,
  lang,
  resetToLanding,
  spectrogramByIndex = {},
}) {
  if (isBackendPredictResponse(predictionResult)) {
    return (
      <BackendResultPanel
        result={predictionResult}
        dict={dict}
        lang={lang}
        resetToLanding={resetToLanding}
        spectrogramByIndex={spectrogramByIndex}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl bg-[var(--c-card)]/82 backdrop-blur-md p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[var(--c-text)]/5">
      <div className="mb-8">
        <ResultTitleBar dict={dict} />

        {predictionResult.is_mock && (
          <p className="mt-3 text-center text-sm font-bold text-amber-600 bg-amber-500/10 inline-block px-4 py-2 rounded-full">
            {dict.mockMode}
          </p>
        )}
      </div>

      <PerchResultBody
        chunk={{
          predictions: predictionResult.predictions,
          decision_support: predictionResult.decision_support,
          index: 0,
        }}
        dict={dict}
        lang={lang}
        isOverview
        backendError={predictionResult.backend_error}
        spectrogramByIndex={spectrogramByIndex}
      />

      <div className="text-center mt-8">
        <button
          onClick={resetToLanding}
          className="text-[var(--c-primary)] font-bold underline"
        >
          {dict.backBtn}
        </button>
      </div>
    </div>
  );
}
