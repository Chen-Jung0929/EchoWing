import React, { createContext, useContext } from 'react';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';
import { useNavigate } from 'react-router-dom';
import { getDict } from '../i18n';

const AudioAnalysisContext = createContext(null);

export function AudioAnalysisProvider({ children, lang }) {
  const navigate = useNavigate();
  const dict = getDict(lang);
  const audioAnalysis = useAudioAnalysis(dict, navigate);

  return (
    <AudioAnalysisContext.Provider value={audioAnalysis}>
      {children}
    </AudioAnalysisContext.Provider>
  );
}

export function useAudioAnalysisContext() {
  const context = useContext(AudioAnalysisContext);
  if (!context) {
    throw new Error('useAudioAnalysisContext must be used within an AudioAnalysisProvider');
  }
  return context;
}
