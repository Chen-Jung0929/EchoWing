import { resolveConfidenceThreshold } from '../../config/confidenceThreshold';
import ChunkResultsView from '../../utils/ChunkResultsView';
import { getLocalizedText } from '../../i18n/getLocalizedText';
import PerchResultBody from './PerchResultBody';

export default function BackendResultPanel({
  result,
  dict,
  lang,
  resetToLanding,
  spectrogramByIndex,
}) {
  return (
    <ChunkResultsView
      result={result}
      dict={dict}
      lang={lang}
      getLocalizedText={getLocalizedText}
      resetToLanding={resetToLanding}
      spectrogramByIndex={spectrogramByIndex}
      renderChunkBody={(chunk, opts = {}) => (
        <PerchResultBody
          chunk={chunk}
          dict={dict}
          lang={lang}
          isSummary={opts.isSummary}
          confidenceThreshold={
            resolveConfidenceThreshold(
              opts.confidenceThreshold ?? result.confidence_threshold
            )
          }
          spectrogramByIndex={opts.spectrogramByIndex ?? spectrogramByIndex}
          resultChunks={opts.resultChunks ?? result.chunks}
          totalDurationSec={
            opts.totalDurationSec ?? result.stream_meta?.total_duration_sec ?? 0
          }
          xaiPending={opts.xaiPending ?? result.xai_pending === true}
        />
      )}
    />
  );
}
