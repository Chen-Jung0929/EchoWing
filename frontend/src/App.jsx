import  { useState, useEffect, useMemo, useRef } from 'react';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { analyzeAudioChunks } from './services/api';
import ChunkResultsView from './utils/ChunkResultsView';
import AttentionWeightsSection from './utils/AttentionWeightsSection';
import { MdClose, MdLanguage, MdDarkMode, MdLightMode, MdCloudUpload } from 'react-icons/md';

// --- 語系字典 ---
const t = {
  zh: {
    title: 'EchoWing',
    subtitle: '鳥聲辨識',
    uploadBtn: '上傳音訊或影片',
    processBtn: '開始處理並辨識',
    loadingText: '系統正在分析音訊特徵...',
    themeLight: '白天',
    themeDark: '黑夜',
    themeSystem: '系統',
    langToggle: 'English',
    noFileWarning: '請先上傳音訊或影片檔案',
    resultTitle: '預測結果',
    taskLabel: '聲學辨識分析',
    analyzedAt: '分析時間',
    sourceFile: '原始檔案',
    backBtn: '返回首頁',
    selectedFile: '已選擇檔案',
    errorTitle: '辨識失敗',
    retryBtn: '重新上傳',

    mockMode: 'Mock data mode：後端尚未連線，已載入本地測試資料',
    topSpecies: '主要物種預測',
    topClasses: '主要分類預測',
    attentionWeights: '注意力權重',
    attentionBinsLabel: '個時間窗',
    collapseAttention: '收合注意力權重',
    expandAttention: '展開注意力權重',
    decisionSupport: '決策輔助',
    riskAnalysis: '風險分析',
    actionRecommendation: '行動建議',
    disclaimer: '免責聲明',
    probability: '信心分數',
    percent: '百分比',
    speciesId: '物種 ID',
    className: '分類名稱',
    backendError: '後端錯誤',
    backendResult: '後端推論結果',
    chunksCount: '音訊片段',
    chunkLabel: '片段',
    topPredictions: 'Top-K 預測',
    warnings: '警告',
    classLabels: '類別總數',
    decodeFailed: '此片段解碼失敗',
    rawResponse: '完整回應 (JSON)',
    summaryLabel: '總覽',
    summaryTabShort: '總',
    tabHoverHint: '滑鼠移至分頁可預覽物種',
    prevPage: '上一頁',
    nextPage: '下一頁',
    validChunks: '有效片段',
    voteModeHint: '以下為各片段 Top 預測的投票彙整結果',
    voteCount: '得票',
    appearsInChunks: '出現片段',
    noSpeciesHint: '尚無物種預測',
  },

  en: {
    title: 'EchoWing',
    subtitle: 'Bird Sound Recognition',
    uploadBtn: 'Upload Audio/Video',
    processBtn: 'Process & Identify',
    loadingText: 'Analyzing acoustic features...',
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',
    themeSystem: 'System Default',
    langToggle: '中文',
    noFileWarning: 'Please upload an audio or video file first.',
    resultTitle: 'Prediction Results',
    taskLabel: 'Acoustic analysis',
    analyzedAt: 'Analyzed at',
    sourceFile: 'Source file',
    backBtn: 'Back to Home',
    selectedFile: 'Selected file',
    errorTitle: 'Recognition Failed',
    retryBtn: 'Upload Again',

    mockMode: 'Mock data mode: backend is not connected; local test data has been loaded.',
    topSpecies: 'Top Species',
    topClasses: 'Top Classes',
    attentionWeights: 'Attention Weights',
    attentionBinsLabel: 'time windows',
    collapseAttention: 'Collapse attention weights',
    expandAttention: 'Expand attention weights',
    decisionSupport: 'Decision Support',
    riskAnalysis: 'Risk Analysis',
    actionRecommendation: 'Action Recommendation',
    disclaimer: 'Disclaimer',
    probability: 'Confidence',
    percent: 'Percent',
    speciesId: 'Species ID',
    className: 'Class Name',
    backendError: 'Backend Error',
    backendResult: 'Backend Inference Result',
    chunksCount: 'Audio chunks',
    chunkLabel: 'Chunk',
    topPredictions: 'Top-K predictions',
    warnings: 'Warnings',
    classLabels: 'Total classes',
    decodeFailed: 'Decode failed for this chunk',
    rawResponse: 'Full response (JSON)',
    summaryLabel: 'Summary',
    summaryTabShort: 'All',
    tabHoverHint: 'Hover a tab to preview species',
    prevPage: 'Previous',
    nextPage: 'Next',
    validChunks: 'Valid segments',
    voteModeHint: 'Vote aggregate across segment top predictions',
    voteCount: 'Votes',
    appearsInChunks: 'Segments',
    noSpeciesHint: 'No species prediction',
  },
};

const USE_MOCK_FALLBACK = false;
const MOCK_RESULT_URL = '/mock_data/perch_result.json';
const MOCK_LOADING_DURATION_MS = 6000;
const LOADING_DURATION_MS = 6000;


function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isBackendPredictResponse(data) {
  return (
    Array.isArray(data?.chunks) &&
    data.chunks.length > 0 &&
    (data.chunks[0]?.predictions != null || data.chunks[0]?.error != null)
  );
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

function getLocalizedText(value, lang) {
  if (value == null) return '';

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return value[lang] ?? value.en ?? value.zh ?? '';
  }

  return String(value);
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
  const [systemIsDark, setSystemIsDark] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { processAudio, isProcessing } = useAudioProcessor();

  const dict = t[lang];

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
    setErrorMessage('');
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);
    setPredictionResult(null);
    setErrorMessage('');
  };

  const fileRef = useRef(null);
  // 清除選擇的檔案
  const handleFileClear = () => {
    fileRef.current.value = '';
    setSelectedFile(null);
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
      const chunks = await processAudio(selectedFile);
      const result = await analyzeAudioChunks(chunks, {
        name: selectedFile.name,
      });

      await wait(LOADING_DURATION_MS);
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
          <div
            className="text-xl font-black tracking-wider text-[var(--c-text)] cursor-pointer"
            onClick={resetToLanding}
          >
            EchoWing
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
                <label className="w-full py-4 rounded-xl border-2 border-dashed border-[var(--c-primary)] text-[var(--c-primary)] font-bold text-lg hover:bg-[var(--c-primary)] hover:text-[var(--c-muted)] transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-1">
                  <MdCloudUpload className="w-10 h-10 text-[var(--c-primary)]" />
                  <span className="text-center">{dict.uploadBtn}</span>
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    ref={fileRef}
                  />
                </label>

                {selectedFile && (
                  <div className="flex text-sm text-[var(--c-text)]/70 bg-[var(--c-bg)]/70 rounded-xl px-4 py-3 break-all">
                    <span className="font-bold">{dict.selectedFile}：</span>
                    {selectedFile.name}
                    <MdClose className="ml-auto w-5 h-5 text-[var(--c-text)]" onClick={handleFileClear} />
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
            className="min-h-screen px-6 pt-28 pb-16 flex justify-center"
            style={{
              background: isDarkMode
                ? 'linear-gradient(to bottom, #141a1a 0%, #3D342F 100%)'
                : 'linear-gradient(to bottom, #E9D5CC 0%, #DCD7DC 100%)',
            }}
          >
            <ResultPanel
              predictionResult={predictionResult}
              dict={dict}
              lang={lang}
              resetToLanding={resetToLanding}
            />
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

/* ---------------- Perch-style result body (single chunk) ---------------- */

function PerchResultBody({ chunk, dict, lang, isSummary = false }) {
  return (
    <>
      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-[var(--c-bg)]/72 rounded-2xl p-6">
          <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
            {dict.topSpecies}
          </h3>
          <div className="space-y-4">
            {chunk.predictions?.top_species?.map((species) => (
              <div
                key={species.species_id}
                className="border border-[var(--c-text)]/10 rounded-xl p-4"
              >
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="font-black text-[var(--c-text)]">
                      {getLocalizedText(species.name, lang)}
                    </p>
                    <p className="text-xs text-[var(--c-text)]/50">
                      {dict.speciesId}: {species.species_id}
                    </p>
                    {isSummary && species.vote_count != null && (
                      <p className="text-xs text-[var(--c-primary)]/80 mt-1">
                        {dict.voteCount}: {species.vote_count}
                        {species.chunk_indices?.length > 0 && (
                          <>
                            {' '}
                            · {dict.appearsInChunks}:{' '}
                            {species.chunk_indices.map((i) => i + 1).join('、')}
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--c-text)]/50">
                      {isSummary ? dict.percent : dict.probability}
                    </p>
                    <p className="text-2xl font-black text-[var(--c-primary)]">
                      {Math.round(species.probability * 100)}%
                    </p>
                  </div>
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

        <section className="bg-[var(--c-bg)]/72 rounded-2xl p-6">
          <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
            {dict.topClasses}
          </h3>
          <div className="space-y-4">
            {chunk.predictions?.top_classes?.map((item) => (
              <div
                key={JSON.stringify(item.class_name)}
                className="border border-[var(--c-text)]/10 rounded-xl p-4"
              >
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="text-xs text-[var(--c-text)]/50">
                      {dict.className}
                    </p>
                    <p className="font-black text-[var(--c-text)]">
                      {getLocalizedText(item.class_name, lang)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--c-text)]/50">
                      {dict.percent}
                    </p>
                    <p className="text-2xl font-black text-[var(--c-primary)]">
                      {Math.round(item.probability * 100)}%
                    </p>
                  </div>
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

      <AttentionWeightsSection
        weights={chunk.predictions?.attention_weights}
        dict={dict}
        isSummary={isSummary}
      />

      <section className="mt-6 bg-[var(--c-bg)]/72 rounded-2xl p-6">
        <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
          {dict.decisionSupport}
        </h3>
        <div className="space-y-4 text-[var(--c-text)]/80 leading-relaxed">
          <div>
            <p className="font-black text-[var(--c-text)] mb-1">{dict.riskAnalysis}</p>
            <p>{getLocalizedText(chunk.decision_support?.risk_analysis, lang)}</p>
          </div>
          <div>
            <p className="font-black text-[var(--c-text)] mb-1">
              {dict.actionRecommendation}
            </p>
            <p>
              {getLocalizedText(
                chunk.decision_support?.action_recommendation,
                lang
              )}
            </p>
          </div>
          <div>
            <p className="font-black text-[var(--c-text)] mb-1">{dict.disclaimer}</p>
            <p className="text-sm text-[var(--c-text)]/50 border-t border-[var(--c-text)]/10 pt-4">
              {getLocalizedText(chunk.decision_support?.disclaimer, lang)}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------------- Backend result (path B) ---------------- */

function BackendResultPanel({ result, dict, lang, resetToLanding }) {
  return (
    <ChunkResultsView
      result={result}
      dict={dict}
      lang={lang}
      getLocalizedText={getLocalizedText}
      resetToLanding={resetToLanding}
      renderChunkBody={(chunk, { isSummary } = {}) => (
        <PerchResultBody
          chunk={chunk}
          dict={dict}
          lang={lang}
          isSummary={isSummary}
        />
      )}
    />
  );
}

/* ---------------- Result Panel ---------------- */

function ResultPanel({ predictionResult, dict, lang, resetToLanding }) {
  if (isBackendPredictResponse(predictionResult)) {
    return (
      <BackendResultPanel
        result={predictionResult}
        dict={dict}
        lang={lang}
        resetToLanding={resetToLanding}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl bg-[var(--c-card)]/82 backdrop-blur-md p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[var(--c-text)]/5">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black mb-2 text-[var(--c-text)]">
          {dict.resultTitle}
        </h2>

        {predictionResult.is_mock && (
          <p className="text-sm font-bold text-amber-600 bg-amber-500/10 inline-block px-4 py-2 rounded-full">
            {dict.mockMode}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-[var(--c-bg)]/72 rounded-2xl p-6">
          <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
            {dict.topSpecies}
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
                      {getLocalizedText(species.name, lang)}
                    </p>
                    <p className="text-xs text-[var(--c-text)]/50">
                      {dict.speciesId}: {species.species_id}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-[var(--c-text)]/50">
                      {dict.probability}
                    </p>
                    <p className="text-2xl font-black text-[var(--c-primary)]">
                      {Math.round(species.probability * 100)}%
                    </p>
                  </div>
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

        <section className="bg-[var(--c-bg)]/72 rounded-2xl p-6">
          <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
            {dict.topClasses}
          </h3>

          <div className="space-y-4">
            {predictionResult.predictions?.top_classes?.map((item) => (
              <div
                key={JSON.stringify(item.class_name)}
                className="border border-[var(--c-text)]/10 rounded-xl p-4"
              >
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="text-xs text-[var(--c-text)]/50">
                      {dict.className}
                    </p>
                    <p className="font-black text-[var(--c-text)]">
                      {getLocalizedText(item.class_name, lang)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-[var(--c-text)]/50">
                      {dict.percent}
                    </p>
                    <p className="text-2xl font-black text-[var(--c-primary)]">
                      {Math.round(item.probability * 100)}%
                    </p>
                  </div>
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

      <AttentionWeightsSection
        weights={predictionResult.predictions?.attention_weights}
        dict={dict}
        isSummary={false}
      />

      <section className="mt-6 bg-[var(--c-bg)]/72 rounded-2xl p-6">
        <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
          {dict.decisionSupport}
        </h3>

        <div className="space-y-4 text-[var(--c-text)]/80 leading-relaxed">
          <div>
            <p className="font-black text-[var(--c-text)] mb-1">
              {dict.riskAnalysis}
            </p>
            <p>
              {getLocalizedText(
                predictionResult.decision_support?.risk_analysis,
                lang
              )}
            </p>
          </div>

          <div>
            <p className="font-black text-[var(--c-text)] mb-1">
              {dict.actionRecommendation}
            </p>
            <p>
              {getLocalizedText(
                predictionResult.decision_support?.action_recommendation,
                lang
              )}
            </p>
          </div>

          <div>
            <p className="font-black text-[var(--c-text)] mb-1">
              {dict.disclaimer}
            </p>
            <p className="text-sm text-[var(--c-text)]/50 border-t border-[var(--c-text)]/10 pt-4">
              {getLocalizedText(
                predictionResult.decision_support?.disclaimer,
                lang
              )}
            </p>
          </div>

          {predictionResult.backend_error && (
            <div className="text-xs text-[var(--c-text)]/40 border-t border-[var(--c-text)]/10 pt-4">
              <span className="font-bold">{dict.backendError}: </span>
              {predictionResult.backend_error}
            </div>
          )}
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
  );
}

/* ---------------- Day Hero Scene ---------------- */

function DayHeroScene() {
  const [entered, setEntered] = useState(false);
  const [birdFrame, setBirdFrame] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEntered(true);
    }, 80);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBirdFrame((prev) => (prev === 1 ? 2 : 1));
    }, 220);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #E9D5CC 0%, #DCD7DC 100%)',
        }}
      />

      <img
        src="/day/light-sun.png"
        alt=""
        className={`absolute left-1/2 top-[10%] w-[42vw] max-w-[620px] min-w-[360px] -translate-x-1/2 select-none transition-all duration-[1600ms] ease-out ${
          entered ? 'scale-100 opacity-75' : 'scale-90 opacity-0'
        }`}
      />

      <div
        className={`absolute left-1/2 top-[10%] w-[42vw] max-w-[620px] min-w-[360px] -translate-x-1/2 select-none transition-all duration-[1800ms] ease-out ${
          entered ? 'opacity-75 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <img
          src="/day/light-cloud.png"
          alt=""
          className="w-full h-auto select-none animate-day-cloud-float"
        />
      </div>

      <img
        src="/day/light-left-tree.png"
        alt=""
        className={`absolute left-[0vw] bottom-[2%] w-[48vw] max-w-[760px] min-w-[430px] select-none transition-all duration-[1400ms] ease-out ${
          entered
            ? 'translate-x-0 translate-y-0 opacity-90'
            : '-translate-x-24 translate-y-8 opacity-0'
        }`}
      />

      <img
        src="/day/light-right-tree.png"
        alt=""
        className={`absolute right-[-20vw] bottom-[-20%] w-[48vw] max-w-[800px] min-w-[450px] select-none transition-all duration-[1500ms] ease-out ${
          entered
            ? 'translate-x-0 translate-y-0 opacity-90'
            : 'translate-x-24 translate-y-8 opacity-0'
        }`}
      />

      <div
        className={`absolute left-[40%] top-[18%] w-[10vw] max-w-[1000px] min-w-[650px] select-none transition-opacity duration-700 ${
          entered ? 'opacity-75 animate-day-bird-flight' : 'opacity-0'
        }`}
      >
        <img
          src={`/day/flying-bird${birdFrame}.png`}
          alt=""
          className="w-full h-auto select-none"
        />
      </div>
    </div>
  );
}

/* ---------------- Night Hero Scene ---------------- */

function NightHeroScene() {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEntered(true);
    }, 80);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Night background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              circle at 50% 38%,
              rgba(110, 96, 88, 0.22) 0%,
              rgba(61, 52, 47, 0.08) 34%,
              rgba(61, 52, 47, 0) 48%
            ),
            linear-gradient(to bottom, #141A1A 0%, #3D342F 100%)
          `,
        }}
      />

      {/* Star trails */}
      <StarTrailField />

      {/* Small static stars */}
      <div className="night-star-field" />

      {/* Left tree */}
      <img
        src="/night/night-left-tree.png"
        alt=""
        className={`absolute left-[0vw] bottom-[-10%] w-[48vw] max-w-[760px] min-w-[430px] select-none transition-all duration-[1400ms] ease-out ${
          entered
            ? 'translate-x-0 translate-y-0 opacity-90'
            : '-translate-x-24 translate-y-8 opacity-0'
        }`}
      />

      {/* Right tree */}
      <img
        src="/night/night-right-tree.png"
        alt=""
        className={`absolute right-[-15vw] bottom-[-25%] w-[48vw] max-w-[1600px] min-w-[900px] select-none transition-all duration-[1500ms] ease-out ${
          entered
            ? 'translate-x-0 translate-y-0 opacity-90'
            : 'translate-x-24 translate-y-8 opacity-0'
        }`}
      />
    </div>
  );
}

function StarTrailField() {
  const canvasRef = useRef(null);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 1. 創建一個巨大的正方形畫布 (保證旋轉時能覆蓋各種螢幕尺寸)
    const size = 3000;
    
    // 解決視網膜螢幕 (Retina Display) 的模糊/鋸齒問題
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const center = size / 2;

    // 2. 設定星軌顏色庫 (使用純 RGB，方便做透明度漸層)
    const colors = [
      '205, 224, 239', // 灰藍白
      '238, 246, 255', // 亮白
      '170, 205, 230', // 深灰藍
      '220, 200, 190', // 微暖橘
    ];

    ctx.clearRect(0, 0, size, size);

    // 3. 靜態繪製 400 條平滑星軌
    const numTrails = 400;
    for (let i = 0; i < numTrails; i++) {
      const radius = 50 + Math.random() * 1400;
      const startAngle = Math.random() * Math.PI * 2;
      const trailLength = (Math.random() * 0.4) + 0.1; // 軌跡長度 (弧度)
      const endAngle = startAngle + trailLength;

      const baseColor = colors[Math.floor(Math.random() * colors.length)];
      const thickness = Math.random() * 1.5 + 0.8; // 筆觸粗細

      // 🌟 核心抗鋸齒技術：將一條尾巴切成 30 小段，手動繪製出平滑的「透明度漸層」
      const segments = 20;
      const step = trailLength / segments;
      // 重疊係數：確保線段之間沒有 1px 的裂縫
      const overlap = 0.1 / radius; 

      for (let j = 0; j < segments; j++) {
        const segStart = startAngle + (j * step);
        const segEnd = segStart + step + overlap;

        ctx.beginPath();
        ctx.arc(center, center, radius, segStart, segEnd);
        
        // 透明度由 0 漸變到 0.8
        const opacity = (j / segments) * 0.8;
        ctx.strokeStyle = `rgba(${baseColor}, ${opacity})`;
        ctx.lineWidth = thickness;
        ctx.stroke();
      }

      // 畫出星星本體的亮點 (圓潤的端點)
      ctx.beginPath();
      ctx.arc(center, center, radius, endAngle, endAngle + 0.001);
      ctx.strokeStyle = `rgba(${baseColor}, 0.8)`;
      ctx.lineCap = 'round';
      ctx.lineWidth = thickness + 0.4;
      ctx.stroke();
      ctx.lineCap = 'butt'; // 復原狀態
    }
  }, []);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        // 定位北極星中心點：設在畫面正上方
        top: '0%',     
        left: '50%',    
        width: '3000px',
        height: '3000px',
        // 讓 3000x3000 的方塊中心點，對齊畫面的 top/left 設定
        transform: 'translate(-50%, -50%)',
        zIndex: 0
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          opacity: 0.85,
          mixBlendMode: 'screen',
          // 🌟 交給顯卡處理的純粹旋轉，絕對絲滑
          animation: 'starfield-spin 350s linear infinite'
        }}
      />
    </div>
  );
}

/* ---------------- Loading Animation ---------------- */

function KiwiAnimation() {
  const [frame, setFrame] = useState(1);
  const [progress01, setProgress01] = useState(0);
  const [imageError, setImageError] = useState(false);

  const STAGE_SIZE = 400;
  const CENTER = STAGE_SIZE / 2;

  const FRUIT_SIZE = 300;
  const FRUIT_LEFT = (STAGE_SIZE - FRUIT_SIZE) / 2;
  const FRUIT_TOP = (STAGE_SIZE - FRUIT_SIZE) / 2;

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

  const START_ANGLE_RAD = Math.PI + Math.PI / 36;

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
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
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
            transform: 'scaleX(-1)',
          }}
        />
      </div>
    </div>
  );
}
