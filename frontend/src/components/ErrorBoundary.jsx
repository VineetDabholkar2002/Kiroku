import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log error to console; consider sending to external monitoring
    // in production (Sentry, LogRocket, etc.)
    console.error('ErrorBoundary caught an error', error, info);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900 text-white">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="mt-2 text-sm text-gray-300">An unexpected error occurred. You can reload the page or try again later.</p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold rounded-lg shadow-md shadow-rose-500/20"
            >
              Reload
            </button>
            <button
              onClick={this.reset}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
