import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)] p-6">
          <div className="max-w-md text-center p-8 bg-[var(--c-card)] rounded-3xl shadow-xl border border-[var(--c-text)]/10">
            <h1 className="text-2xl font-black mb-4">Oops! Something went wrong.</h1>
            <p className="text-sm opacity-70 mb-6">
              EchoWing encountered a rendering error. Please refresh or return home.
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
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
