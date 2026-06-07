import { useState, useEffect, useRef, useMemo } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import {
  isRemoteApiBase,
  waitForBackendReady,
  analyzeAudioStream,
} from './services/api';
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  resolveConfidenceThreshold,
} from './config/confidenceThreshold';
import { buildSpectrogramCache } from './utils/spectrogramCache';
import { mergeChunkXai, upsertChunk } from './utils/chunkIdentity';
import { buildTimelineModel } from './utils/timeline/buildTimelineModel';
import { ensureTimeline } from './utils/timeline/ensureTimeline';
import ResultPanel from './features/results/ResultPanel';
import {
  MdClose,
  MdLanguage,
  MdDarkMode,
  MdLightMode,
  MdCloudUpload,
  MdDownload,
  MdHelpOutline,
} from 'react-icons/md';
import AudioRecorder from './components/AudioRecorder/AudioRecorder';
import { isSupportedMediaFile, MEDIA_FILE_ACCEPT } from './utils/supportedMedia';
import { isInAppBrowser } from './utils/inAppBrowser';
import DayHeroScene from './features/hero/DayHeroScene';
import NightHeroScene from './features/hero/NightHeroScene';
import KiwiAnimation from './features/loading/KiwiAnimation';
import GuideModal from './components/GuideModal/GuideModal';
import PrivacyNotice from './components/PrivacyNotice/PrivacyNotice';
import Tooltip from './components/Tooltip/Tooltip';
import {
  DEFAULT_MODEL_SELECTION,
  formatLandingModelOption,
  LANDING_MODEL_OPTIONS,
} from './utils/modelLabel';
import {
  decodeAudioDuration,
  MAX_AUDIO_DURATION_SEC,
  MIN_AUDIO_DURATION_SEC,
} from './utils/audioDuration';
import { detectBrowserLanguage, getDict } from './i18n';

const USE_MOCK_FALLBACK = false;
const MOCK_RESULT_URL = '/mock_data/perch_result.json';
const MIN_SERVER_WAKING_HINT_MS = 3000;
const LANGUAGE_STORAGE_KEY = 'echowing-language';
const THEME_STORAGE_KEY = 'echowing-theme';
const PRIVACY_STORAGE_KEY = 'echowing-privacy-notice-accepted';


function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
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
    input_file: {
      name: file.name,
      size: file.size,
      type: file.type,
    },
  };
}

export default function App() {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || detectBrowserLanguage();
  });
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    return window.localStorage.getItem(THEME_STORAGE_KEY) || 'system';
  });
  const [viewState, setViewState] = useState('landing');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [systemIsDark, setSystemIsDark] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecordedFile, setIsRecordedFile] = useState(false);
  const [recorderError, setRecorderError] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);
  const [spectrogramByIndex, setSpectrogramByIndex] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingHint, setLoadingHint] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_SELECTION);
  const [isProcessing, setIsProcessing] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideSection, setGuideSection] = useState('usage');
  const [privacyNoticeOpen, setPrivacyNoticeOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(PRIVACY_STORAGE_KEY) !== 'true';
  });

  const fileRef = useRef(null);
  const abortControllerRef = useRef(null);
  const predictionStartedAtRef = useRef(null);
  const phase1StartedAtRef = useRef(null);
  const phase2StartedAtRef = useRef(null);

  const dict = getDict(lang);
  const recordingBlocked = useMemo(() => isInAppBrowser(), []);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-TW' : lang;
  }, [lang]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  // --- 寫入 html.light / html.dark ---
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      root.classList.remove('light', 'dark');

      if (themeMode === 'system') {
        root.classList.add(mediaQuery.matches ? 'dark' : 'light');
      } else {
        root.classList.add(themeMode);
      }
    };

    applyTheme();

    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [themeMode]);

  // --- 追蹤系統主題，用來決定 Hero Scene ---
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateSystemTheme = () => {
      setSystemIsDark(mediaQuery.matches);
    };

    updateSystemTheme();

    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);

  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'system' && systemIsDark);

  const handleThemeToggle = () => {
    setThemeMode((prev) => {
      if (prev === 'system') {
        return systemIsDark ? 'light' : 'dark';
      }
      return prev === 'light' ? 'dark' : 'light';
    });
  };

  const showHeroScene = viewState === 'landing';

  const openGuide = (section = 'usage') => {
    setIsMenuOpen(false);
    setGuideSection(section);
    setGuideOpen(true);
  };

  const acceptPrivacyNotice = () => {
    window.localStorage.setItem(PRIVACY_STORAGE_KEY, 'true');
    setPrivacyNoticeOpen(false);
  };

  const openPrivacyGuide = () => {
    setPrivacyNoticeOpen(false);
    openGuide('privacy');
  };

  const resolvePhase2Ms = (timing = {}, prev) => {
    const clientMs =
      phase2StartedAtRef.current != null
        ? Date.now() - phase2StartedAtRef.current
        : undefined;
    const serverMs =
      timing.phase2_ms != null ? Number(timing.phase2_ms) : undefined;
    const prevMs =
      prev?.prediction_phase2_ms != null
        ? Number(prev.prediction_phase2_ms)
        : undefined;

    if (Number.isFinite(serverMs) && serverMs > 0) return serverMs;
    if (Number.isFinite(clientMs) && clientMs > 0) return clientMs;
    if (Number.isFinite(prevMs) && prevMs > 0) return prevMs;
    if (Number.isFinite(serverMs)) return serverMs;
    if (Number.isFinite(prevMs)) return prevMs;
    return undefined;
  };

  const mergePhaseTimings = (prev, timing = {}) => {
    const phase1Ms =
      timing.phase1_ms != null
        ? timing.phase1_ms
        : prev?.prediction_phase1_ms != null
          ? prev.prediction_phase1_ms
          : phase1StartedAtRef.current != null
            ? Date.now() - phase1StartedAtRef.current
            : undefined;
    const phase2Ms = resolvePhase2Ms(timing, prev);
    const hasPhase1 = phase1Ms != null && Number.isFinite(phase1Ms);
    const hasPhase2 = phase2Ms != null && Number.isFinite(phase2Ms);
    const totalMs =
      hasPhase1 && hasPhase2
        ? phase1Ms + phase2Ms
        : prev?.prediction_duration_ms;
    return {
      ...prev,
      ...(hasPhase1 ? { prediction_phase1_ms: phase1Ms } : {}),
      ...(hasPhase2 ? { prediction_phase2_ms: phase2Ms } : {}),
      ...(totalMs != null ? { prediction_duration_ms: totalMs } : {}),
    };
  };

  const applyPredictionDuration = (prev) => {
    if (
      prev?.prediction_phase1_ms != null &&
      prev?.prediction_phase2_ms != null
    ) {
      return mergePhaseTimings(prev, {});
    }
    const started = predictionStartedAtRef.current;
    if (!started || prev?.prediction_duration_ms != null) return prev;
    return { ...prev, prediction_duration_ms: Date.now() - started };
  };

  const resetToLanding = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setViewState('landing');
    setPredictionResult(null);
    setSpectrogramByIndex({});
    setErrorMessage('');
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!isSupportedMediaFile(file)) {
      setErrorMessage(dict.fileTypeUnsupported);
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setIsRecordedFile(false);
    setRecorderError('');
    setPredictionResult(null);
    setSpectrogramByIndex({});
    setErrorMessage('');
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // 清除選擇的檔案
  const handleFileClear = () => {
    fileRef.current.value = '';
    setSelectedFile(null);
    setIsRecordedFile(false);
    setRecorderError('');
    setPredictionResult(null);
    setSpectrogramByIndex({});
    setErrorMessage('');
  };

  const handleRecordingComplete = (file) => {
    if (fileRef.current) fileRef.current.value = '';
    setSelectedFile(file);
    setIsRecordedFile(true);
    setRecorderError('');
    setPredictionResult(null);
    setSpectrogramByIndex({});
    setErrorMessage('');
  };

  const downloadSelectedFile = () => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
  };

  const handleProcess = async () => {
    const file = selectedFile;
    if (!file) {
      setErrorMessage(dict.noFileWarning);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage(dict.fileTooLarge || 'File too large (max 20MB)');
      return;
    }

    try {
      const duration = await decodeAudioDuration(file);
      if (duration != null && duration < MIN_AUDIO_DURATION_SEC) {
        setErrorMessage(dict.fileTooShort);
        return;
      }
      if (duration != null && duration > MAX_AUDIO_DURATION_SEC + 0.5) {
        setErrorMessage(dict.fileTooLong || 'File too long (max 30 seconds)');
        return;
      }
    } catch (e) {
      console.warn('Could not pre-decode audio for length check', e);
    }

    const remoteApi = isRemoteApiBase();
    const serverWakingStartedAt = remoteApi ? Date.now() : null;

    setViewState('loading');
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
            if (!payload.ready) {
              setLoadingHint(dict.serverWakingText);
            } else if (payload.analysis_busy) {
              setLoadingHint(dict.serverBusyText);
            }
          },
        });
        serverConfidenceThreshold = resolveConfidenceThreshold(
          readyPayload.confidence_threshold
        );
        const wakingElapsed = Date.now() - serverWakingStartedAt;
        if (wakingElapsed < MIN_SERVER_WAKING_HINT_MS) {
          await wait(MIN_SERVER_WAKING_HINT_MS - wakingElapsed);
        }
        showBusyHint = Boolean(readyPayload.analysis_busy);
        if (showBusyHint) {
          setLoadingHint(dict.serverBusyText);
        }
      }
      if (!showBusyHint) {
        setLoadingHint(dict.loadingPreparing);
      }
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
              confidence_threshold: resolveConfidenceThreshold(
                chunkData.confidence_threshold ?? prev.confidence_threshold
              ),
              xai_pending: xaiPending,
            }));
            return;
          }

          if (chunkData.event === 'xai_update') {
            setPredictionResult((prev) => ({
              ...prev,
              chunks: mergeChunkXai(prev.chunks, chunkData),
            }));
            return;
          }

          if (chunkData.event === 'xai_done') {
            xaiPending = false;
            const timingPayload = {
              phase1_ms: chunkData.phase1_ms,
              phase2_ms: resolvePhase2Ms(chunkData, null),
            };
            phase2StartedAtRef.current = null;
            setPredictionResult((prev) =>
              applyPredictionDuration(
                mergePhaseTimings(
                  { ...prev, xai_pending: false },
                  timingPayload
                )
              )
            );
            return;
          }

          if (chunkData.event === 'timeline_deconv') {
            if (xaiPending) {
              phase2StartedAtRef.current = Date.now();
            }
            setPredictionResult((prev) => {
              const fromServer = buildTimelineModel(chunkData);
              const timeline =
                fromServer?.species?.length
                  ? fromServer
                  : ensureTimeline({ ...prev, timeline: fromServer });
              const timingPayload = { phase1_ms: chunkData.phase1_ms };
              if (!xaiPending && chunkData.phase2_ms != null) {
                timingPayload.phase2_ms = chunkData.phase2_ms;
              }
              return mergePhaseTimings(
                { ...prev, timeline, xai_pending: xaiPending },
                timingPayload
              );
            });
            setLoadingHint(xaiPending ? dict.loadingXai : '');
            setViewState('result');
            return;
          }

          if (chunkData.error) {
            setErrorMessage(chunkData.error);
            setViewState('error');
            return;
          }

          receivedAnyChunk = true;

          setPredictionResult((prev) => ({
            ...prev,
            chunks: upsertChunk(prev.chunks, chunkData),
            confidence_threshold: resolveConfidenceThreshold(
              chunkData.confidence_threshold ?? prev.confidence_threshold
            ),
          }));

          if (chunkData.spectrogram) {
            setSpectrogramByIndex((prev) => ({
              ...prev,
              ...buildSpectrogramCache([chunkData]),
            }));
          }
        },
      });

      setPredictionResult((prev) => {
        const withPhases = mergePhaseTimings(prev, {});
        const withDuration = applyPredictionDuration(withPhases);
        const next = withDuration?.xai_pending
          ? { ...withDuration, xai_pending: false }
          : { ...withDuration };
        const timeline = ensureTimeline(next);
        if (timeline && !next.timeline?.species?.length) {
          return { ...next, timeline };
        }
        return next;
      });

      if (receivedAnyChunk) {
        setViewState('result');
      }
      
      
    } catch (backendError) {
      if (backendError?.name === 'AbortError') {
        return;
      }
      console.error('Backend prediction failed:', backendError);

      if (USE_MOCK_FALLBACK) {
        try {
          const mockResult = await loadMockPredictionResult(selectedFile);
          await wait(1000);

          setPredictionResult({
            ...mockResult,
            confidence_threshold: resolveConfidenceThreshold(
              mockResult.confidence_threshold
            ),
            processed_at: new Date().toISOString(),
            prediction_duration_ms: predictionStartedAtRef.current
              ? Date.now() - predictionStartedAtRef.current
              : null,
            backend_error:
              backendError instanceof Error
                ? backendError.message
                : 'Unknown backend error',
          });

          setViewState('result');
          return;
        } catch (mockError) {
          console.error('Mock fallback failed:', mockError);

          setErrorMessage(
            mockError instanceof Error
              ? mockError.message
              : 'Backend and mock fallback both failed.'
          );

          setViewState('error');
          return;
        }
      }

      setErrorMessage(
        backendError instanceof Error
          ? backendError.message
          : 'Unknown backend error'
      );

      setViewState('error');
    } finally {
      setLoadingHint('');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans">
      {/* Hero background：只在首頁顯示 */}
      {showHeroScene && (isDarkMode ? <NightHeroScene /> : <DayHeroScene />)}

      {/* 若 canvas-texture 造成矩形感，可先註解掉這行 */}
      <div className="canvas-texture pointer-events-none" />

      {/* --- 導覽列 --- */}
      <nav
        className={`fixed top-0 w-full z-40 backdrop-blur-md border-b ${
          isDarkMode
          ? 'bg-[#141A1A]/90 border-white/5'
          : 'bg-[#E9D5CC]/25 border-[#2F4A5F]/5'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="EchoWing" className="w-10 h-10" />
            <div
              className="text-xl font-black tracking-wider text-[var(--c-text)] cursor-pointer"
              onClick={resetToLanding}
            >
              EchoWing
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip label={isDarkMode ? dict.themeLight : dict.themeDark}>
              <button
              type="button"
              onClick={handleThemeToggle}
              className="p-2 rounded-lg hover:bg-[var(--c-card)]/40 transition-colors focus:outline-none"
              aria-label={isDarkMode ? dict.themeLight : dict.themeDark}
              title={isDarkMode ? dict.themeLight : dict.themeDark}
            >
              {isDarkMode ? (
                <MdDarkMode className="w-6 h-6 text-[var(--c-text)]" />
              ) : (
                <MdLightMode className="w-6 h-6 text-[var(--c-text)]" />
              )}
              </button>
            </Tooltip>

            <Tooltip label={dict.languageMenuLabel}>
              <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-2 rounded-lg hover:bg-[var(--c-card)]/40 transition-colors focus:outline-none"
              aria-label={dict.languageMenuLabel}
              title={dict.languageMenuLabel}
              aria-expanded={isMenuOpen}
            >
              <MdLanguage className="w-6 h-6 text-[var(--c-text)]" />
              </button>
            </Tooltip>

            <Tooltip label={dict.navGuide}>
              <button
              type="button"
              onClick={() => openGuide('usage')}
              className="p-2 rounded-lg hover:bg-[var(--c-card)]/40 transition-colors focus:outline-none"
              aria-label={dict.navGuide}
              title={dict.navGuide}
            >
              <MdHelpOutline className="w-6 h-6 text-[var(--c-text)]" />
              </button>
            </Tooltip>

            
            {/* <button
              type="button"
              onClick={() => setIsLoggedIn((prev) => !prev)}
              className="p-2 rounded-lg hover:bg-[var(--c-card)]/40 transition-colors focus:outline-none"
              aria-label={isLoggedIn ? dict.logout : dict.login}
              aria-pressed={isLoggedIn}
            >
              {isLoggedIn ? (
                <MdLogout className="w-6 h-6 text-[var(--c-text)]" />
              ) : (
                <MdLogin className="w-6 h-6 text-[var(--c-text)]" />
              )}
            </button> */}
            
          </div>
        </div>

        {isMenuOpen && (
          <div className="absolute top-full right-0 w-full md:w-48 bg-[var(--c-card)]/90 backdrop-blur-md border-b md:border-l md:border-b md:rounded-bl-2xl border-[var(--c-text)]/10 shadow-2xl p-4">
            <div className="grid grid-cols-2 gap-2" role="listbox" aria-label={dict.languageMenuLabel}>
              {[
                { code: 'zh', label: '中文' },
                { code: 'en', label: 'English' },
                { code: 'ja', label: '日本語' },
                { code: 'ko', label: '한국어' },
              ].map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  role="option"
                  aria-selected={lang === code}
                  onClick={() => {
                    setLang(code);
                    setIsMenuOpen(false);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                    lang === code
                      ? 'bg-[var(--c-primary)]/20 text-[var(--c-primary)] ring-2 ring-[var(--c-primary)]/40'
                      : 'text-[var(--c-text)]/70 hover:bg-[var(--c-card)]/60 hover:text-[var(--c-text)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="relative z-10 min-h-screen">
        {/* 1. 首頁 */}
        {viewState === 'landing' && (
          <div className="relative z-20 w-full min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">
            <div className="w-full max-w-lg flex flex-col items-center animate-fade-in-up">
              <div className="text-center mb-10">
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-[var(--c-text)] mb-2 drop-shadow-sm">
                  {dict.title}
                </h1>
                <h2 className="text-xl md:text-2xl font-bold text-[var(--c-primary)] tracking-widest">
                  {dict.subtitle}
                </h2>
              </div>

              <div className="w-full bg-[var(--c-card)]/72 backdrop-blur-md p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.10)] border border-[var(--c-text)]/5 flex flex-col space-y-6">
                
                <div className="flex w-full min-w-0 flex-col gap-2">
                  <div className="flex w-full min-w-0 items-stretch gap-3">
                    <label
                      className="flex min-h-[5.5rem] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--c-primary)] py-4 text-lg font-bold text-[var(--c-primary)] transition-all duration-300 hover:bg-[var(--c-primary)] hover:text-[var(--c-muted)]"
                      title={dict.tooltipUpload}
                    >
                      <MdCloudUpload className="h-10 w-10 text-[var(--c-primary)]" />
                      <span className="px-1 text-center leading-tight">{dict.uploadBtn}</span>
                      <input
                        type="file"
                        accept={MEDIA_FILE_ACCEPT}
                        onChange={handleFileChange}
                        className="hidden"
                        ref={fileRef}
                      />
                    </label>

                    <div className="w-[5.5rem] shrink-0 self-stretch">
                      <AudioRecorder
                        dict={dict}
                        onRecordingComplete={handleRecordingComplete}
                        onErrorChange={setRecorderError}
                        recordingDisabled={recordingBlocked}
                      />
                    </div>
                  </div>

                  <p className="text-center text-xs text-[var(--c-text)]/55">{dict.uploadFormatsHint}</p>
                  {recordingBlocked ? (
                    <p className="text-center text-xs text-amber-600 dark:text-amber-400" role="status">
                      {dict.inAppBrowserRecordingHint}
                    </p>
                  ) : (
                    <p className="text-center text-xs text-[var(--c-text)]/45">{dict.recordMaxHint}</p>
                  )}

                  {recorderError ? (
                    <p className="text-center text-sm font-bold text-red-500" role="alert">
                      {recorderError}
                    </p>
                  ) : null}
                </div>

                {selectedFile && (
                  <div className="flex min-w-0 items-center gap-2 rounded-xl bg-[var(--c-bg)]/70 px-4 py-3 text-sm text-[var(--c-text)]/70">
                    <span className="shrink-0 font-bold">{dict.selectedFile}：</span>
                    <span className="min-w-0 flex-1 break-all">{selectedFile.name}</span>
                    {isRecordedFile ? (
                      <button
                        type="button"
                        onClick={downloadSelectedFile}
                        className="shrink-0 rounded-lg p-1 text-[var(--c-text)] transition-colors hover:bg-[var(--c-card)]"
                        aria-label={dict.downloadRecording}
                        title={dict.downloadRecording}
                      >
                        <MdDownload className="h-5 w-5" aria-hidden />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleFileClear}
                      className="shrink-0 rounded-lg p-1 text-[var(--c-text)] transition-colors hover:bg-[var(--c-card)]"
                      aria-label={dict.clearSelectedFile}
                      title={dict.clearSelectedFile}
                    >
                      <MdClose className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div className="text-sm font-bold text-red-500 bg-red-500/10 rounded-xl px-4 py-3">
                    {errorMessage}
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="model-select"
                    className="text-sm font-bold text-[var(--c-text)]/70"
                  >
                    {dict.modelSelectionLabel}
                  </label>
                  <select
                    id="model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-[var(--c-bg)]/70 text-[var(--c-text)] border-none rounded-xl px-4 py-3 font-bold cursor-pointer"
                    aria-label={dict.tooltipModelSelection}
                    title={dict.tooltipModelSelection}
                  >
                    {LANDING_MODEL_OPTIONS.map(({ value }) => (
                      <option key={value} value={value}>
                        {formatLandingModelOption(value, dict)}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between gap-3 px-1 text-xs text-[var(--c-text)]/55">
                    <span>{dict.modelHints[selectedModel]}</span>
                    <button
                      type="button"
                      onClick={() => openGuide('models')}
                      className="shrink-0 font-black text-[var(--c-primary)] underline decoration-dotted underline-offset-4"
                    >
                      {dict.modelHintLearnMore}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleProcess}
                  disabled={!selectedFile || isProcessing}
                  aria-label={dict.tooltipProcess}
                  title={dict.tooltipProcess}
                  className={`w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all duration-300 ${
                    selectedFile && !isProcessing
                      ? 'bg-[var(--c-primary)] text-[var(--c-bg)] hover:shadow-xl hover:-translate-y-1 hover:brightness-110'
                      : 'bg-[var(--c-text)]/20 text-[var(--c-text)]/40 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? dict.loadingText : dict.processBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. 載入中 */}
        {viewState === 'loading' && (
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
        )}

        {/* 3. 結果頁 */}
        {viewState === 'result' && predictionResult && (
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
        )}

        {/* 4. 錯誤頁 */}
        {viewState === 'error' && (
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
        )}

        {/* 5. 使用說明與模型宣告（彈窗） */}
        <GuideModal
          key={`${guideOpen}-${guideSection}`}
          open={guideOpen}
          dict={dict}
          initialSection={guideSection}
          onClose={() => setGuideOpen(false)}
          onReopenPrivacy={() => {
            setGuideOpen(false);
            setPrivacyNoticeOpen(true);
          }}
        />
        <PrivacyNotice
          open={privacyNoticeOpen}
          dict={dict}
          onAccept={acceptPrivacyNotice}
          onOpenPrivacy={openPrivacyGuide}
        />
      </main>

      <SpeedInsights />
    </div>
  );
}
