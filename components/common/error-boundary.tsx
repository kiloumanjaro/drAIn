'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryFallbackProps {
  error: Error;
  /** Clears the error and mounts the children again. */
  reset: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** What to show instead of the children once they have thrown. */
  fallback: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  /** The error is cleared whenever this value changes. */
  resetKey?: unknown;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  resetKey: unknown;
}

/**
 * Keeps a failure in one part of the page from replacing the whole page with
 * app/error.tsx. Error boundaries have to be class components.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
    if (Object.is(props.resetKey, state.resetKey)) return null;
    return { error: null, resetKey: props.resetKey };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === 'function'
      ? fallback({ error, reset: this.reset })
      : fallback;
  }
}
