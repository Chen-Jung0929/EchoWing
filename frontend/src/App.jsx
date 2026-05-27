import { useState, useEffect, useRef } from 'react';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { analyzeAudioChunks } from './services/api';
import { buildSpectrogramCache } from './utils/spectrogramCache';
import ResultPanel from './features/results/ResultPanel';
import {
  MdClose,
  MdLanguage,
  MdDarkMode,
  MdLightMode,
  MdCloudUpload,
  MdDownload,
} from 'react-icons/md';
import AudioRecorder from './components/AudioRecorder/AudioRecorder';
import { getDict } from './i18n';
import DayHeroScene from './features/hero/DayHeroScene';
import NightHeroScene from './features/hero/NightHeroScene';
import KiwiAnimation from './features/loading/KiwiAnimation';

const USE_MOCK_FALLBACK = false;
const MOCK_RESULT_URL = '/mock_data/perch_result.json';
const MOCK_LOADING_DURATION_MS = 6000;
const LOADING_DURATION_MS = 3000;


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
    if (typeof navigator === 'undefined') return 'zh';

    const systemLang = navigator.languages?.[0] ?? navigator.language ?? 'zh';
    return systemLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  });
  const [themeMode, setThemeMode] = useState('system');
  const [viewState, setViewState] = useState('landing');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [systemIsDark, setSystemIsDark] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecordedFile, setIsRecordedFile] = useState(false);
  const [recorderError, setRecorderError] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);
  const [spectrogramByIndex, setSpectrogramByIndex] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const { processAudio, isProcessing } = useAudioProcessor();

  const dict = getDict(lang);

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

  const resetToLanding = () => {
    setViewState('landing');
    setPredictionResult(null);
    setSpectrogramByIndex({});
    setErrorMessage('');
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);
    setIsRecordedFile(false);
    setRecorderError('');
    setPredictionResult(null);
    setSpectrogramByIndex({});
    setErrorMessage('');
  };

  const fileRef = useRef(null);
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
    if (!selectedFile) {
      setErrorMessage(dict.noFileWarning);
      return;
    }

    setViewState('loading');
    setErrorMessage('');
    setPredictionResult(null);
    setSpectrogramByIndex({});

    try {
      const [, result] = await Promise.all([
        wait(LOADING_DURATION_MS),
        (async () => {
          const chunks = await processAudio(selectedFile);
          const result = await analyzeAudioChunks(chunks, {
            name: selectedFile.name,
          });
          setSpectrogramByIndex(buildSpectrogramCache(result.chunks));
          return result;
        })(),
      ]);
      setPredictionResult({
        ...result,
        processed_at: new Date().toISOString(),
      });
      setViewState('result');
    } catch (backendError) {
      console.error('Backend prediction failed:', backendError);

      if (USE_MOCK_FALLBACK) {
        try {
          const [mockResult] = await Promise.all([
            loadMockPredictionResult(selectedFile),
            wait(MOCK_LOADING_DURATION_MS),
          ]);

          setPredictionResult({
            ...mockResult,
            processed_at: new Date().toISOString(),
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
            <button
              type="button"
              onClick={handleThemeToggle}
              className="p-2 rounded-lg hover:bg-[var(--c-card)]/40 transition-colors focus:outline-none"
              aria-label={isDarkMode ? dict.themeLight : dict.themeDark}
            >
              {isDarkMode ? (
                <MdDarkMode className="w-6 h-6 text-[var(--c-text)]" />
              ) : (
                <MdLightMode className="w-6 h-6 text-[var(--c-text)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-2 rounded-lg hover:bg-[var(--c-card)]/40 transition-colors focus:outline-none"
              aria-label="Language"
              aria-expanded={isMenuOpen}
            >
              <MdLanguage className="w-6 h-6 text-[var(--c-text)]" />
            </button>

            
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
            <div className="flex gap-2" role="listbox" aria-label="Language">
              {[
                { code: 'zh', label: '中文' },
                { code: 'en', label: 'English' },
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
                    <label className="flex min-h-[5.5rem] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--c-primary)] py-4 text-lg font-bold text-[var(--c-primary)] transition-all duration-300 hover:bg-[var(--c-primary)] hover:text-[var(--c-muted)]">
                      <MdCloudUpload className="h-10 w-10 text-[var(--c-primary)]" />
                      <span className="px-1 text-center leading-tight">{dict.uploadBtn}</span>
                      <input
                        type="file"
                        accept="audio/*,video/*"
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
                      />
                    </div>
                  </div>

                  <p className="text-center text-xs text-[var(--c-text)]/55">{dict.recordMaxHint}</p>

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

                <button
                  onClick={handleProcess}
                  disabled={!selectedFile || isProcessing}
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
            <p className="mt-8 text-lg font-bold text-[var(--c-primary)] tracking-widest">
              {dict.loadingText}
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
      </main>

    </div>
  );
}

