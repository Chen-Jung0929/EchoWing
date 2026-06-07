import usePageMeta from '../hooks/usePageMeta';
import { useAudioAnalysisContext } from '../context/AudioAnalysisContext';

export default function ErrorPage({ dict, isDarkMode }) {
  usePageMeta(dict.errorTitle || '發生錯誤');
  const { errorMessage, resetToLanding } = useAudioAnalysisContext();
  return (
    <div
      className="min-h-screen px-6 pt-28 pb-16 flex items-center justify-center"
      style={{
        background: isDarkMode
          ? '#3D342F'
          : 'linear-gradient(to bottom, #E9D5CC 0%, #DCD7DC 100%)',
      }}
    >
      <div className="w-full max-w-lg text-center bg-[var(--c-card)]/82 backdrop-blur-md p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-red-500/20">
        <h2 className="text-3xl font-black mb-4 text-red-500">
          {dict.errorTitle}
        </h2>
        <p className="text-[var(--c-text)]/70 break-words">
          {errorMessage}
        </p>
        <button
          onClick={resetToLanding}
          className="mt-8 px-6 py-3 rounded-xl bg-[var(--c-primary)] text-[var(--c-bg)] font-black shadow-lg hover:brightness-110 transition-all"
        >
          {dict.retryBtn}
        </button>
      </div>
    </div>
  );
}
