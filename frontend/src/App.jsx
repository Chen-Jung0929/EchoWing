import React, { useState, useEffect, Suspense } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BrowserRouter, Routes, Route, useLocation , Link } from 'react-router-dom';
import { MdLanguage, MdDarkMode, MdLightMode, MdHelpOutline } from 'react-icons/md';

import { detectBrowserLanguage, getDict, LANGUAGE_OPTIONS } from './i18n';
import Tooltip from './components/Tooltip/Tooltip';
import GuideModal from './components/GuideModal/GuideModal';
import PrivacyNotice from './components/PrivacyNotice/PrivacyNotice';
import DayHeroScene from './features/hero/DayHeroScene';
import NightHeroScene from './features/hero/NightHeroScene';
import { AudioAnalysisProvider } from './context/AudioAnalysisContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// Dynamic Imports
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const LoadingPage = React.lazy(() => import('./pages/LoadingPage'));
const ResultPage = React.lazy(() => import('./pages/ResultPage'));
const ErrorPage = React.lazy(() => import('./pages/ErrorPage'));
const XaiEducationPage = React.lazy(() => import('./pages/XaiEducationPage/XaiEducationPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

const LANGUAGE_STORAGE_KEY = 'echowing-language';
const THEME_STORAGE_KEY = 'echowing-theme';
const PRIVACY_STORAGE_KEY = 'echowing-privacy-notice-accepted';

function AppLayout() {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || detectBrowserLanguage();
  });
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    return window.localStorage.getItem(THEME_STORAGE_KEY) || 'system';
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [systemIsDark, setSystemIsDark] = useState(false);

  const [guideOpen, setGuideOpen] = useState(false);
  const [guideSection, setGuideSection] = useState('usage');
  const [privacyNoticeOpen, setPrivacyNoticeOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(PRIVACY_STORAGE_KEY) !== 'true';
  });

  const dict = getDict(lang);
  
  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    const htmlLang = LANGUAGE_OPTIONS.find(o => o.code === lang)?.htmlLang || lang;
    document.documentElement.lang = htmlLang;
  }, [lang]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => setSystemIsDark(mediaQuery.matches);
    updateSystemTheme();
    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);

  const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && systemIsDark);

  const handleThemeToggle = () => {
    setThemeMode((prev) => {
      if (prev === 'system') return systemIsDark ? 'light' : 'dark';
      return prev === 'light' ? 'dark' : 'light';
    });
  };

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

  // We show Hero Scene only on the Landing route (effectively handled by z-index or checking pathname)
  const location = useLocation();
  const isLandingRoute = location.pathname === '/';

  return (
    <AudioAnalysisProvider lang={lang}>
      <div className="min-h-screen relative overflow-hidden font-sans">
        {/* Hero Background */}
        {isLandingRoute && (isDarkMode ? <NightHeroScene /> : <DayHeroScene />)}
        <div className="canvas-texture pointer-events-none" />

        {/* Navigation */}
        <nav
          className={`fixed top-0 w-full z-40 backdrop-blur-md border-b ${
            isDarkMode ? 'bg-[#141A1A]/90 border-white/5' : 'bg-[#E9D5CC]/25 border-[#2F4A5F]/5'
          }`}
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="EchoWing" className="w-10 h-10" />
              <Link to="/" className="text-xl font-black tracking-wider text-[var(--c-text)] no-underline">EchoWing</Link>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm font-bold text-[var(--c-text)]/70 mr-auto ml-8">
              <Link to="/" className="nav-link-button no-underline">{dict.xaiEducation?.homeLabel}</Link>
              <Link to="/how-it-works" className="nav-link-button no-underline">{dict.xaiEducation?.navLabel}</Link>
            </div>

            <div className="flex items-center gap-1">
              <Tooltip label={isDarkMode ? dict.themeLight : dict.themeDark}>
                <button
                  type="button"
                  onClick={handleThemeToggle}
                  className="nav-icon-button"
                  aria-label={isDarkMode ? dict.themeLight : dict.themeDark}
                >
                  {isDarkMode ? (
                    <MdDarkMode className="w-6 h-6 text-[var(--c-text)]" />
                  ) : (
                    <MdLightMode className="w-6 h-6 text-[var(--c-text)]" />
                  )}
                </button>
              </Tooltip>

              <div className="relative flex items-center">
                <Tooltip label={dict.languageMenuLabel}>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    className="nav-icon-button"
                    aria-label={dict.languageMenuLabel}
                    aria-expanded={isMenuOpen}
                    aria-haspopup="listbox"
                  >
                    <MdLanguage className="w-6 h-6 text-[var(--c-text)]" />
                  </button>
                </Tooltip>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 max-h-[70vh] w-56 overflow-y-auto rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-card)]/95 p-2 shadow-2xl backdrop-blur-md">
                    <div className="flex flex-col gap-1" role="listbox" aria-label={dict.languageMenuLabel}>
                      {LANGUAGE_OPTIONS.map(({ code, label }) => (
                        <button
                          key={code}
                          type="button"
                          role="option"
                          aria-selected={lang === code}
                          onClick={() => {
                            setLang(code);
                            setIsMenuOpen(false);
                          }}
                          className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-[var(--c-primary)] ${
                            lang === code
                              ? 'bg-[var(--c-primary)]/20 text-[var(--c-primary)] ring-1 ring-[var(--c-primary)]/40'
                              : 'text-[var(--c-text)]/70 hover:bg-[var(--c-bg)]/70 hover:text-[var(--c-text)]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <Tooltip label={dict.navGuide}>
                  <button
                    type="button"
                    onClick={() => openGuide('usage')}
                    className="nav-icon-button"
                    aria-label={dict.navGuide}
                  >
                    <MdHelpOutline className="w-6 h-6 text-[var(--c-text)]" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </nav>

        <main className="relative z-10 min-h-screen">
          <ErrorBoundary>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
              <Routes>
                <Route path="/" element={<LandingPage dict={dict} openGuide={openGuide} />} />
                <Route path="/loading" element={<LoadingPage dict={dict} isDarkMode={isDarkMode} />} />
                <Route path="/result" element={<ResultPage dict={dict} lang={lang} isDarkMode={isDarkMode} />} />
                <Route path="/error" element={<ErrorPage dict={dict} isDarkMode={isDarkMode} />} />
                <Route path="/how-it-works" element={<XaiEducationPage dict={dict} />} />
                <Route path="*" element={<NotFoundPage dict={dict} />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>

        
        <footer className="relative z-10 border-t border-[var(--c-text)]/10 py-6 text-center text-sm text-[var(--c-text)]/50">
          <div className="max-w-6xl mx-auto px-6">
            <p>© {new Date().getFullYear()} EchoWing Team. {dict.footerRights}</p>
            <p className="mt-1">
              {dict.footerDescription}
            </p>
          </div>
        </footer>
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

        <SpeedInsights />
      </div>
    </AudioAnalysisProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
