import React from 'react';

const LANGUAGE_STORAGE_KEY = 'echowing-language';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      "ErrorBoundary caught a fatal rendering error:", 
      "\nMessage:", error?.message, 
      "\nStack:", error?.stack, 
      "\nComponent Stack:", errorInfo?.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      let lang = 'en';
      try {
        lang = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';
      } catch (e) {}

      const isZhFamily = lang === 'zh' || lang === 'nan' || lang === 'hak' || lang === 'yue' || lang === 'lzh';
      const title = isZhFamily ? '糟糕！' : 'Oops!';
      const message = isZhFamily
        ? '發生畫面渲染錯誤，請重新整理或返回首頁。'
        : 'EchoWing encountered a rendering error. Please refresh or return home.';
      const btn = isZhFamily ? '返回首頁' : 'Return Home';

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)] p-6">
          <div className="max-w-md text-center p-8 bg-[var(--c-card)] rounded-3xl shadow-xl border border-[var(--c-text)]/10">
            <h1 className="text-2xl font-black mb-4">{title}</h1>
            <p className="text-sm opacity-70 mb-6">
              {message}
            </p>
            {import.meta.env.DEV && (
              <pre className="text-xs text-left p-4 bg-black/10 rounded-lg overflow-x-auto mb-6 text-red-400">
                {this.state.error?.toString()}
              </pre>
            )}
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2.5 bg-[var(--c-primary)] text-white font-bold rounded-xl hover:bg-[var(--c-primary)]/80 transition-colors"
            >
              {btn}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
