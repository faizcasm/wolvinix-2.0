import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes so a single broken widget never takes the
 * whole app down with a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Wolvinix render error", error, info.componentStack);
    this.props.onError?.(error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="card max-w-md p-8 text-center">
          <div className="bg-danger-soft text-danger mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold">Something broke</h1>
          <p className="text-muted mt-2 text-sm">
            A part of the page failed to render. Your data is safe — try again, or reload if it
            keeps happening.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={this.reset}
              className="bg-brand-500 hover:bg-brand-400 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="border-border hover:bg-surface-2 h-10 rounded-xl border px-4 text-sm font-medium transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
