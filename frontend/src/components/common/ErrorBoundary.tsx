import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '../ui/Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional label shown in the fallback, e.g. "Owner Portal". */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-time errors in the wrapped subtree so a bug in one page
 * (e.g. a bad field access on context data) shows a recoverable screen
 * instead of a blank white tab for the whole app.
 *
 * React error boundaries must be class components — there is no hook
 * equivalent for getDerivedStateFromError / componentDidCatch.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.section ? `: ${this.props.section}` : ''}]`, error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-[#FBECEA] text-[#A8332B]">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="font-serif text-2xl font-semibold tracking-[-0.015em] text-[#1D3E37]">
          {this.props.section ? `${this.props.section} hit a snag` : 'Something went wrong'}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[#545B56]">
          This screen ran into an unexpected error. You can try again, or head back to the
          homepage. Your bookings and account are unaffected.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={this.handleReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              window.location.href = '/';
            }}
            className="gap-1.5"
          >
            <Home className="h-3.5 w-3.5" />
            Back to home
          </Button>
        </div>
      </div>
    );
  }
}
