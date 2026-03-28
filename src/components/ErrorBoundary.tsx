import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong. Please try again later.";
      
      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error && parsedError.error.includes("insufficient permissions")) {
            displayMessage = "You don't have permission to perform this action. Please check your access or log in again.";
          }
        }
      } catch (e) {
        if (this.state.error?.message) {
          displayMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-red-100 p-8 max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900">Application Error</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {displayMessage}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
              <RefreshCcw size={18} /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
