import React from 'react';
import KiwiAnimation from '../features/loading/KiwiAnimation';
import { useAudioAnalysisContext } from '../context/AudioAnalysisContext';

export default function LoadingPage({ dict, isDarkMode }) {
  const { loadingHint } = useAudioAnalysisContext();
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 pt-24"
      style={{
        background: isDarkMode
          ? 'linear-gradient(to bottom, #141a1a 0%, #3D342F 100%)'
          : 'linear-gradient(to bottom, #E9D5CC 0%, #DCD7DC 100%)',
      }}
    >
      <KiwiAnimation />
      <p className="mt-8 text-lg font-bold text-[var(--c-primary)] tracking-widest text-center px-6">
        {loadingHint || dict.loadingText}
      </p>
    </div>
  );
}
