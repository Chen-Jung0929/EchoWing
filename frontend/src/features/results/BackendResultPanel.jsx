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
            opts.confidenceThreshold ?? result.confidence_threshold ?? 0.8
          }
          spectrogramByIndex={opts.spectrogramByIndex ?? spectrogramByIndex}
          resultChunks={opts.resultChunks ?? result.chunks}
        />
      )}
    />
  );
}
