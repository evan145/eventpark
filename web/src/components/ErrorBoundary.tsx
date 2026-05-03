import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }
  componentDidCatch(): void { /* report */ }
  reset = () => this.setState({ hasError: false, message: undefined });
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto" role="alert" data-testid="error-fallback">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-700 mb-4">{this.state.message ?? 'An unexpected error occurred.'}</p>
          <button type="button" className="btn-primary" onClick={this.reset}>Try again</button>
          <a href="/" className="ml-3 btn-ghost">Go home</a>
        </div>
      );
    }
    return this.props.children;
  }
}
