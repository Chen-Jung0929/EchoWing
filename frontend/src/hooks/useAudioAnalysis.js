import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isRemoteApiBase, waitForBackendReady, analyzeAudioStream } from '../services/api';
import { DEFAULT_CONFIDENCE_THRESHOLD, resolveConfidenceThreshold } from '../config/confidenceThreshold';
import { buildSpectrogramCache } from '../utils/spectrogramCache';
import { mergeChunkXai, upsertChunk } from '../utils/chunkIdentity';
import { buildTimelineModel } from '../utils/timeline/buildTimelineModel';
import { ensureTimeline } from '../utils/timeline/ensureTimeline';
import { decodeAudioDuration, MIN_AUDIO_DURATION_SEC, MAX_AUDIO_DURATION_SEC } from '../utils/audioDuration';

const USE_MOCK_FALLBACK = false;
const MOCK_RESULT_URL = '/mock_data/perch_result.json';
const MIN_SERVER_WAKING_HINT_MS = 3000;
const ANALYSIS_ROUTES = new Set(['/loading', '/result']);

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function loadMockPredictionResult(file) {
  const response = await fetch(MOCK_RESULT_URL);
  if (!response.ok) {
    throw new Error(`Failed to load mock data from ${MOCK_RESULT_URL}`);
  }
  const mockData = await response.json();
  return {
    ...mockData,
    is_mock: true,
    input_file: { name: file.name, size: file.size, type: file.type },
  };
}

export function useAudioAnalysis(dict, onNavigate) {
  const location = useLocation();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecordedFile, setIsRecordedFile] = useState(false);
  const [selectedFileMetadata, setSelectedFileMetadata] = useState({ status: 'idle', duration: null });
  const [recorderError, setRecorderError] = useState('');
  
  const [predictionResult, setPredictionResult] = useState(null);
  const [spectrogramByIndex, setSpectrogramByIndex] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingHint, setLoadingHint] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const abortControllerRef = useRef(null);
  const predictionStartedAtRef = useRef(null);
  const phase1StartedAtRef = useRef(null);
  const phase2StartedAtRef = useRef(null);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (!selectedFile) return undefined;
    let cancelled = false;
    decodeAudioDuration(selectedFile)
      .then((duration) => {
        if (cancelled) return;
        setSelectedFileMetadata(
          duration == null
            ? { status: 'unavailable', duration: null }
            : { status: 'ready', duration }
        );
      })
      .catch(() => {
        if (!cancelled) setSelectedFileMetadata({ status: 'unavailable', duration: null });
      });
    return () => { cancelled = true; };
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleFileClear = () => {
    setSelectedFile(null);
    setSelectedFileMetadata({ status: 'idle', duration: null });
    setIsRecordedFile(false);
    setRecorderError('');
    setPredictionResult(null);
    setSpectrogramByIndex({});
    setErrorMessage('');
  };

  const cancelAnalysis = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    predictionStartedAtRef.current = null;
    phase1StartedAtRef.current = null;
    phase2StartedAtRef.current = null;
    setLoadingHint('');
    setIsProcessing(false);
    handleFileClear();
  };

  const resetToLanding = () => {
    cancelAnalysis();
    onNavigate?.('/');
  };

  useEffect(() => {
    const prev = prevPathRef.current;
    const next = location.pathname;
    prevPathRef.current = next;

    if (prev === next) return;

    const leftAnalysisFlow = ANALYSIS_ROUTES.has(prev) && !ANALYSIS_ROUTES.has(next);
    if (leftAnalysisFlow && next !== '/error') {
      cancelAnalysis();
    }
  }, [location.pathname]);

  const resolvePhase2Ms = (timing = {}, prev) => {
    const clientMs = phase2StartedAtRef.current != null ? Date.now() - phase2StartedAtRef.current : undefined;
    const serverMs = timing.phase2_ms != null ? Number(timing.phase2_ms) : undefined;
    const prevMs = prev?.prediction_phase2_ms != null ? Number(prev.prediction_phase2_ms) : undefined;

    if (Number.isFinite(serverMs) && serverMs > 0) return serverMs;
    if (Number.isFinite(clientMs) && clientMs > 0) return clientMs;
    if (Number.isFinite(prevMs) && prevMs > 0) return prevMs;
    if (Number.isFinite(serverMs)) return serverMs;
    if (Number.isFinite(prevMs)) return prevMs;
    return undefined;
  };

  const mergePhaseTimings = (prev, timing = {}) => {
    const phase1Ms = timing.phase1_ms != null ? timing.phase1_ms : prev?.prediction_phase1_ms != null ? prev.prediction_phase1_ms : phase1StartedAtRef.current != null ? Date.now() - phase1StartedAtRef.current : undefined;
    const phase2Ms = resolvePhase2Ms(timing, prev);
    const hasPhase1 = phase1Ms != null && Number.isFinite(phase1Ms);
    const hasPhase2 = phase2Ms != null && Number.isFinite(phase2Ms);
    const totalMs = hasPhase1 && hasPhase2 ? phase1Ms + phase2Ms : prev?.prediction_duration_ms;
    return {
      ...prev,
      ...(hasPhase1 ? { prediction_phase1_ms: phase1Ms } : {}),
      ...(hasPhase2 ? { prediction_phase2_ms: phase2Ms } : {}),
      ...(totalMs != null ? { prediction_duration_ms: totalMs } : {}),
    };
  };

  const applyPredictionDuration = (prev) => {
    if (prev?.prediction_phase1_ms != null && prev?.prediction_phase2_ms != null) {
      return mergePhaseTimings(prev, {});
    }
    const started = predictionStartedAtRef.current;
    if (!started || prev?.prediction_duration_ms != null) return prev;
    return { ...prev, prediction_duration_ms: Date.now() - started };
  };

  const handleProcess = async (selectedModel) => {
    const file = selectedFile;
    if (!file) {
      setErrorMessage(dict.noFileWarning);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage(dict.fileTooLarge);
      return;
    }

    try {
      const duration = selectedFileMetadata.status === 'ready' ? selectedFileMetadata.duration : await decodeAudioDuration(file);
      if (duration != null && duration < MIN_AUDIO_DURATION_SEC) {
        setErrorMessage(dict.fileTooShort);
        return;
      }
      if (duration != null && duration > MAX_AUDIO_DURATION_SEC + 0.5) {
        setErrorMessage(dict.fileTooLong);
        return;
      }
    } catch (e) {
      console.warn('Could not pre-decode audio for length check', e);
    }

    const remoteApi = isRemoteApiBase();
    const serverWakingStartedAt = remoteApi ? Date.now() : null;

    onNavigate?.('/loading');
    setLoadingHint(remoteApi ? dict.serverWakingText : dict.loadingPreparing);
    setErrorMessage('');
    setPredictionResult(null);
    setSpectrogramByIndex({});
    predictionStartedAtRef.current = Date.now();
    phase1StartedAtRef.current = null;
    phase2StartedAtRef.current = null;

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const { signal } = abortController;

    try {
      let serverConfidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD;
      let showBusyHint = false;
      if (remoteApi) {
        const readyPayload = await waitForBackendReady({
          signal,
          onTick: (payload) => {
            if (!payload.ready) setLoadingHint(dict.serverWakingText);
            else if (payload.analysis_busy) setLoadingHint(dict.serverBusyText);
          },
        });
        serverConfidenceThreshold = resolveConfidenceThreshold(readyPayload.confidence_threshold);
        const wakingElapsed = Date.now() - serverWakingStartedAt;
        if (wakingElapsed < MIN_SERVER_WAKING_HINT_MS) {
          await wait(MIN_SERVER_WAKING_HINT_MS - wakingElapsed);
        }
        showBusyHint = Boolean(readyPayload.analysis_busy);
        if (showBusyHint) setLoadingHint(dict.serverBusyText);
      }
      if (!showBusyHint) setLoadingHint(dict.loadingPreparing);
      
      setIsProcessing(true);
      setLoadingHint(dict.loadingPredicting);
      
      const baseResult = {
        chunks: [],
        original_filename: selectedFile.name,
        processed_at: new Date().toISOString(),
        confidence_threshold: serverConfidenceThreshold,
        warnings: [],
        xai_pending: false,
      };
      setPredictionResult(baseResult);
      
      let receivedAnyChunk = false;
      let xaiPending = false;

      await analyzeAudioStream(selectedFile, { name: selectedFile.name }, {
        modelSelection: selectedModel,
        signal,
        onChunk: (chunkData) => {
          if (chunkData.event === 'init') {
            phase1StartedAtRef.current = Date.now();
            xaiPending = Boolean(chunkData.xai_pending);
            setLoadingHint(dict.loadingPredicting);
            setPredictionResult((prev) => ({
              ...prev,
              stream_meta: {
                total_duration_sec: chunkData.total_duration_sec,
                model: chunkData.model,
                window_sec: chunkData.window_sec,
                stride_sec: chunkData.stride_sec,
              },
              confidence_threshold: resolveConfidenceThreshold(chunkData.confidence_threshold ?? prev.confidence_threshold),
              xai_pending: xaiPending,
            }));
            return;
          }

          if (chunkData.event === 'xai_update') {
            setPredictionResult((prev) => ({ ...prev, chunks: mergeChunkXai(prev.chunks, chunkData) }));
            return;
          }

          if (chunkData.event === 'xai_done') {
            xaiPending = false;
            const timingPayload = { phase1_ms: chunkData.phase1_ms, phase2_ms: resolvePhase2Ms(chunkData, null) };
            phase2StartedAtRef.current = null;
            setPredictionResult((prev) => applyPredictionDuration(mergePhaseTimings({ ...prev, xai_pending: false }, timingPayload)));
            return;
          }

          if (chunkData.event === 'timeline_deconv') {
            if (xaiPending) phase2StartedAtRef.current = Date.now();
            setPredictionResult((prev) => {
              const fromServer = buildTimelineModel(chunkData);
              const timeline = fromServer?.species?.length ? fromServer : ensureTimeline({ ...prev, timeline: fromServer });
              const timingPayload = { phase1_ms: chunkData.phase1_ms };
              if (!xaiPending && chunkData.phase2_ms != null) timingPayload.phase2_ms = chunkData.phase2_ms;
              return mergePhaseTimings({ ...prev, timeline, xai_pending: xaiPending }, timingPayload);
            });
            setLoadingHint(xaiPending ? dict.loadingXai : '');
            onNavigate?.('/result');
            return;
          }

          if (chunkData.error) {
            setErrorMessage(chunkData.error);
            onNavigate?.('/error');
            return;
          }

          receivedAnyChunk = true;
          setPredictionResult((prev) => ({
            ...prev,
            chunks: upsertChunk(prev.chunks, chunkData),
            confidence_threshold: resolveConfidenceThreshold(chunkData.confidence_threshold ?? prev.confidence_threshold),
          }));

          if (chunkData.spectrogram) {
            setSpectrogramByIndex((prev) => ({ ...prev, ...buildSpectrogramCache([chunkData]) }));
          }
        },
      });

      setPredictionResult((prev) => {
        const withPhases = mergePhaseTimings(prev, {});
        const withDuration = applyPredictionDuration(withPhases);
        const next = withDuration?.xai_pending ? { ...withDuration, xai_pending: false } : { ...withDuration };
        const timeline = ensureTimeline(next);
        if (timeline && !next.timeline?.species?.length) return { ...next, timeline };
        return next;
      });

      if (receivedAnyChunk) onNavigate?.('/result');
      
    } catch (backendError) {
      if (backendError?.name === 'AbortError') return;
      console.error('Backend prediction failed:', backendError);

      if (USE_MOCK_FALLBACK) {
        try {
          const mockResult = await loadMockPredictionResult(selectedFile);
          await wait(1000);
          setPredictionResult({
            ...mockResult,
            confidence_threshold: resolveConfidenceThreshold(mockResult.confidence_threshold),
            processed_at: new Date().toISOString(),
            prediction_duration_ms: predictionStartedAtRef.current ? Date.now() - predictionStartedAtRef.current : null,
            backend_error: backendError.code ? dict.apiErrors?.[backendError.code] || dict[backendError.code] || backendError.message : backendError.message || dict.unknownError,
          });
          onNavigate?.('/result');
          return;
        } catch (mockError) {
          console.error('Mock fallback failed:', mockError);
          setErrorMessage(mockError.message || dict.unknownError);
          onNavigate?.('/error');
          return;
        }
      }

      setErrorMessage(backendError.code ? dict.apiErrors?.[backendError.code] || dict[backendError.code] || backendError.message : backendError.message || dict.unknownError);
      onNavigate?.('/error');
    } finally {
      setLoadingHint('');
      setIsProcessing(false);
    }
  };

  return {
    selectedFile, setSelectedFile,
    isRecordedFile, setIsRecordedFile,
    selectedFileMetadata, setSelectedFileMetadata,
    recorderError, setRecorderError,
    predictionResult, spectrogramByIndex,
    errorMessage, setErrorMessage,
    loadingHint, isProcessing,
    handleFileClear, handleProcess, resetToLanding
  };
}
