import React, { useState, useEffect, useMemo } from 'react';

// --- 語系字典 ---
const t = {
  zh: {
    title: 'BirdCLEF 2026',
    subtitle: '聲學辨識系統',
    uploadBtn: '上傳音訊或影片',
    processBtn: '開始處理並辨識',
    loadingText: '系統正在分析音訊特徵...',
    themeLight: '白天',
    themeDark: '黑夜',
    themeSystem: '系統',
    langToggle: 'English',
    noFileWarning: '請先上傳音訊或影片檔案',
    resultTitle: '預測結果',
    backBtn: '返回首頁',
    selectedFile: '已選擇檔案',
    errorTitle: '辨識失敗',
    retryBtn: '重新上傳',
  },
  en: {
    title: 'BirdCLEF 2026',
    subtitle: 'Acoustic Recognition',
    uploadBtn: 'Upload Audio/Video',
    processBtn: 'Process & Identify',
    loadingText: 'Analyzing acoustic features...',
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',
    themeSystem: 'System Default',
    langToggle: '中文',
    noFileWarning: 'Please upload an audio or video file first.',
    resultTitle: 'Prediction Results',
    backBtn: 'Back to Home',
    selectedFile: 'Selected file',
    errorTitle: 'Recognition Failed',
    retryBtn: 'Upload Again',
  },
};

const USE_MOCK_FALLBACK = true;
const MOCK_RESULT_URL = '/mock_data/perch_result.json';

const MOCK_LOADING_DURATION_MS = 6000;

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * 正式版辨識函式
 *
 * 這裡不使用 setTimeout。
 * 頁面會停留在 loading，直到這個 async function resolve 或 reject。
 *
 * 你之後只要把 /api/predict 換成你的後端 API endpoint 即可。
 */
async function runBirdRecognition(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/predict', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const errorData = await response.json();
      if (errorData?.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // 若後端不是 JSON error，就保留原始錯誤訊息
    }

    throw new Error(errorMessage);
  }

  return response.json();
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
  const [lang, setLang] = useState('zh');
  const [themeMode, setThemeMode] = useState('system');
  const [viewState, setViewState] = useState('landing');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const dict = t[lang];

  // --- 主題切換邏輯 ---
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

  const resetToLanding = () => {
    setViewState('landing');
    setPredictionResult(null);
    setErrorMessage('');
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);
    setPredictionResult(null);
    setErrorMessage('');
  };

const handleProcess = async () => {
  if (!selectedFile) {
    setErrorMessage(dict.noFileWarning);
    return;
  }

  setViewState('loading');
  setErrorMessage('');
  setPredictionResult(null);

  try {
    const result = await runBirdRecognition(selectedFile);
    setPredictionResult(result);
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
      <div className="canvas-texture" />

      {/* --- 導覽列與漢堡選單 --- */}
      <nav className="fixed top-0 w-full z-40 backdrop-blur-md bg-[var(--c-bg)]/80 border-b border-[var(--c-text)]/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div
            className="text-xl font-black tracking-wider text-[var(--c-text)] cursor-pointer"
            onClick={resetToLanding}
          >
            BirdCLEF
          </div>

          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="p-2 rounded-lg hover:bg-[var(--c-card)] transition-colors focus:outline-none"
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6 text-[var(--c-text)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div className="absolute top-full right-0 w-full md:w-64 bg-[var(--c-card)] border-b md:border-l md:border-b md:rounded-bl-2xl border-[var(--c-text)]/10 shadow-2xl p-6 flex flex-col space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">
                Language
              </p>
              <button
                onClick={() => {
                  setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
                  setIsMenuOpen(false);
                }}
                className="w-full text-left font-bold text-[var(--c-primary)] hover:opacity-70 transition-opacity"
              >
                {dict.langToggle}
              </button>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">
                Theme
              </p>
              <div className="flex flex-col space-y-3">
                {['light', 'dark', 'system'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setThemeMode(mode);
                      setIsMenuOpen(false);
                    }}
                    className={`text-left text-sm font-bold transition-all ${
                      themeMode === mode
                        ? 'text-[var(--c-primary)] translate-x-2'
                        : 'text-[var(--c-text)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    {mode === 'light'
                      ? dict.themeLight
                      : mode === 'dark'
                        ? dict.themeDark
                        : dict.themeSystem}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* --- 主要內容區塊 --- */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-20 px-6">
        {/* 1. 首頁視圖 */}
        {viewState === 'landing' && (
          <div className="w-full max-w-lg flex flex-col items-center animate-fade-in-up">
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-[var(--c-text)] mb-2 drop-shadow-sm">
                {dict.title}
              </h1>
              <h2 className="text-xl md:text-2xl font-bold text-[var(--c-primary)] tracking-widest">
                {dict.subtitle}
              </h2>
            </div>

            <div className="w-full bg-[var(--c-card)] p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[var(--c-text)]/5 flex flex-col space-y-6">
              <label className="w-full py-4 rounded-xl border-2 border-dashed border-[var(--c-primary)] text-[var(--c-primary)] font-bold text-lg hover:bg-[var(--c-primary)] hover:text-[var(--c-muted)] transition-all duration-300 cursor-pointer text-center">
                + {dict.uploadBtn}
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {selectedFile && (
                <div className="text-sm text-[var(--c-text)]/70 bg-[var(--c-bg)] rounded-xl px-4 py-3 break-all">
                  <span className="font-bold">{dict.selectedFile}：</span>
                  {selectedFile.name}
                </div>
              )}

              {errorMessage && (
                <div className="text-sm font-bold text-red-500 bg-red-500/10 rounded-xl px-4 py-3">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleProcess}
                disabled={!selectedFile}
                className={`w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all duration-300 ${
                  selectedFile
                    ? 'bg-[var(--c-primary)] text-[var(--c-bg)] hover:shadow-xl hover:-translate-y-1 hover:brightness-110'
                    : 'bg-[var(--c-text)]/20 text-[var(--c-text)]/40 cursor-not-allowed'
                }`}
              >
                {dict.processBtn}
              </button>
            </div>
          </div>
        )}

        {/* 2. 載入中視圖 */}
        {viewState === 'loading' && (
          <div className="flex flex-col items-center">
            <KiwiAnimation />
            <p className="mt-8 text-lg font-bold text-[var(--c-primary)] tracking-widest">
              {dict.loadingText}
            </p>
          </div>
        )}

        {/* 3. 結果頁視圖 */}
        {viewState === 'result' && predictionResult && (
  <div className="w-full max-w-4xl bg-[var(--c-card)] p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[var(--c-text)]/5">
    <div className="text-center mb-8">
      <h2 className="text-3xl font-black mb-2 text-[var(--c-text)]">
        {dict.resultTitle}
      </h2>

      {predictionResult.is_mock && (
        <p className="text-sm font-bold text-amber-600 bg-amber-500/10 inline-block px-4 py-2 rounded-full">
          Mock data mode：後端尚未連線，已載入本地測試資料
        </p>
      )}
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      {/* Top species */}
      <section className="bg-[var(--c-bg)] rounded-2xl p-6">
        <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
          Top Species
        </h3>

        <div className="space-y-4">
          {predictionResult.predictions?.top_species?.map((species) => (
            <div
              key={species.species_id}
              className="border border-[var(--c-text)]/10 rounded-xl p-4"
            >
              <div className="flex justify-between items-center gap-4">
                <div>
                  <p className="font-black text-[var(--c-text)]">
                    {species.name}
                  </p>
                  <p className="text-xs text-[var(--c-text)]/50">
                    {species.species_id}
                  </p>
                </div>

                <p className="text-2xl font-black text-[var(--c-primary)]">
                  {Math.round(species.probability * 100)}%
                </p>
              </div>

              <div className="mt-3 h-2 rounded-full bg-[var(--c-text)]/10 overflow-hidden">
                <div
                  className="h-full bg-[var(--c-primary)] rounded-full"
                  style={{ width: `${species.probability * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top classes */}
      <section className="bg-[var(--c-bg)] rounded-2xl p-6">
        <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
          Top Classes
        </h3>

        <div className="space-y-4">
          {predictionResult.predictions?.top_classes?.map((item) => (
            <div
              key={item.class_name}
              className="border border-[var(--c-text)]/10 rounded-xl p-4"
            >
              <div className="flex justify-between items-center gap-4">
                <p className="font-black text-[var(--c-text)]">
                  {item.class_name}
                </p>

                <p className="text-2xl font-black text-[var(--c-primary)]">
                  {Math.round(item.probability * 100)}%
                </p>
              </div>

              <div className="mt-3 h-2 rounded-full bg-[var(--c-text)]/10 overflow-hidden">
                <div
                  className="h-full bg-[var(--c-primary)] rounded-full"
                  style={{ width: `${item.probability * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>

    {/* Attention weights */}
    <section className="mt-6 bg-[var(--c-bg)] rounded-2xl p-6">
      <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
        Attention Weights
      </h3>

      <div className="flex items-end gap-2 h-32">
        {predictionResult.predictions?.attention_weights?.map((weight, index) => (
          <div
            key={`${index}-${weight}`}
            className="flex-1 flex flex-col items-center justify-end gap-2"
          >
            <div
              className="w-full rounded-t-lg bg-[var(--c-primary)] opacity-80"
              style={{
                height: `${Math.max(weight * 100, 3)}%`,
              }}
            />
            <span className="text-xs text-[var(--c-text)]/50">
              {index + 1}
            </span>
          </div>
        ))}
      </div>
    </section>

    {/* Decision support */}
    <section className="mt-6 bg-[var(--c-bg)] rounded-2xl p-6">
      <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
        Decision Support
      </h3>

      <div className="space-y-4 text-[var(--c-text)]/80 leading-relaxed">
        <div>
          <p className="font-black text-[var(--c-text)] mb-1">
            Risk Analysis
          </p>
          <p>{predictionResult.decision_support?.risk_analysis}</p>
        </div>

        <div>
          <p className="font-black text-[var(--c-text)] mb-1">
            Action Recommendation
          </p>
          <p>{predictionResult.decision_support?.action_recommendation}</p>
        </div>

        <div className="text-sm text-[var(--c-text)]/50 border-t border-[var(--c-text)]/10 pt-4">
          {predictionResult.decision_support?.disclaimer}
        </div>
      </div>
    </section>

    <div className="text-center mt-8">
      <button
        onClick={resetToLanding}
        className="text-[var(--c-primary)] font-bold underline"
      >
        {dict.backBtn}
      </button>
    </div>
  </div>
)}

        {/* 4. 錯誤頁視圖 */}
        {viewState === 'error' && (
          <div className="w-full max-w-lg text-center bg-[var(--c-card)] p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-red-500/20">
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
        )}
      </main>
    </div>
  );
}

function KiwiAnimation() {
  const [frame, setFrame] = useState(1);
  const [progress01, setProgress01] = useState(0);
  const [imageError, setImageError] = useState(false);

  const STAGE_SIZE = 400;
  const CENTER = STAGE_SIZE / 2;

  const FRUIT_SIZE = 300; 
  const FRUIT_LEFT = (STAGE_SIZE - FRUIT_SIZE) / 2;
  const FRUIT_TOP = (STAGE_SIZE - FRUIT_SIZE) / 2;
  const FRUIT_VISUAL_RADIUS = 38;
  const FOOT_ORBIT_RADIUS = 60;

  const FRAME_CONFIG = {
    1: {
      w: 108,
      h: 82,
      footPxX: 8, 
      footPxY: 85, 
    },
    2: {
      w: 108,
      h: 82,
      footPxX: 8,
      footPxY: 85,
    },
  };

  const cfg = FRAME_CONFIG[frame];
  const START_ANGLE_RAD = Math.PI + Math.PI/18;

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev === 1 ? 2 : 1));
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress01((prev) => {
        const next = prev + 0.005;
        return next >= 1 ? 0 : next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  const motion = useMemo(() => {
    const theta = START_ANGLE_RAD + progress01 * Math.PI * 2;

    const footX = CENTER + FOOT_ORBIT_RADIUS * Math.cos(theta);
    const footY = CENTER + FOOT_ORBIT_RADIUS * Math.sin(theta);

    const birdAngleDeg = (theta * 180) / Math.PI + 90;

    const revealDeg =
      (((theta - START_ANGLE_RAD) * 180) / Math.PI + 360) % 360;

    return {
      theta,
      footX,
      footY,
      birdAngleDeg,
      revealDeg,
    };
  }, [progress01]);

  const revealMask = `conic-gradient(
    from -90deg,
    black 0deg,
    black ${motion.revealDeg}deg,
    transparent ${motion.revealDeg}deg,
    transparent 360deg
  )`;

  if (imageError) {
    return (
      <div className="relative w-64 h-64 flex items-center justify-center text-4xl">
        🥝
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: `${STAGE_SIZE}px`,
        height: `${STAGE_SIZE}px`,
      }}
    >
      {/* kiwi fruit */}
      <div
        className="absolute"
        style={{
          left: `${FRUIT_LEFT}px`,
          top: `${FRUIT_TOP}px`,
          width: `${FRUIT_SIZE}px`,
          height: `${FRUIT_SIZE}px`,
        }}
      >
        <img
          src="/kiwi-fruit.png"
          alt=""
          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none opacity-15"
        />

        <img
          src="/kiwi-fruit.png"
          alt="Loading progress"
          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
          style={{
            WebkitMaskImage: revealMask,
            maskImage: revealMask,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
          }}
        />
      </div>

      <div
        className="absolute pointer-events-none"
        style={{
          width: `${cfg.w}px`,
          height: `${cfg.h}px`,
          left: `${motion.footX - cfg.footPxX}px`,
          top: `${motion.footY - cfg.footPxY}px`,
          transform: `rotate(${motion.birdAngleDeg}deg)`,
          transformOrigin: `${cfg.footPxX}px ${cfg.footPxY}px`,
        }}
      >
        <img
          src={`/kiwi${frame}.png`}
          alt="Walking Kiwi"
          onError={() => setImageError(true)}
          className="w-full h-full object-contain drop-shadow-md select-none"
          style={{
            transform: "scaleX(-1)",
          }}
        />
      </div>
    </div>
  );
}