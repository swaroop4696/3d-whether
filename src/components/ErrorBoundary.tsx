import React, { type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Globe } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[ErrorBoundary] Caught render exception:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#030712] text-white select-none">
          <div
            className="w-full max-w-md p-8 rounded-3xl border border-sky-500/30 text-center space-y-6 shadow-2xl backdrop-blur-2xl"
            style={{
              background: 'radial-gradient(ellipse at top, rgba(14, 28, 54, 0.95), rgba(3, 7, 18, 0.98))',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.2)',
            }}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Globe className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                GeoAtmosphere 3D Restored
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                The 3D spatial engine recovered from a temporary graphics or viewport transition.
              </p>
            </div>

            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-sky-500/25 active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              Re-enter 3D Globe
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

