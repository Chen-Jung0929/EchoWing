import React, { useEffect } from 'react';
import usePageMeta from '../hooks/usePageMeta';
import ResultPanel from '../features/results/ResultPanel';
import { useAudioAnalysisContext } from '../context/AudioAnalysisContext';
import { useNavigate } from 'react-router-dom';

export default function ResultPage({ dict, lang, isDarkMode }) {
  usePageMeta(dict.resultTitle, undefined, dict.pageMetaTitleSuffix);
  const navigate = useNavigate();
  const { predictionResult, resetToLanding, spectrogramByIndex } = useAudioAnalysisContext();

  useEffect(() => {
    if (!predictionResult) {
      navigate('/');
    }
  }, [predictionResult, navigate]);

  if (!predictionResult) return null;

  return (
    <div
      className="min-h-screen px-4 sm:px-6 pt-28 pb-16"
      style={{
        background: isDarkMode
          ? 'linear-gradient(to bottom, #141a1a 0%, #3D342F 100%)'
          : 'linear-gradient(to bottom, #E9D5CC 0%, #DCD7DC 100%)',
      }}
    >
      <div className="mx-auto flex w-full max-w-4xl justify-center">
        <ResultPanel
          predictionResult={predictionResult}
          dict={dict}
          lang={lang}
          resetToLanding={resetToLanding}
          spectrogramByIndex={spectrogramByIndex}
        />
      </div>
    </div>
  );
}
