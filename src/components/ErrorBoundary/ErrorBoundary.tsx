import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render-time errors anywhere below it and shows a calm Russian
 * fallback instead of a white screen inside the VK client. Uses no VKUI
 * tokens so it renders even if the provider tree is what failed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep a console trace for field debugging; no third party.
    console.error('App crashed:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__card">
            <div className="error-boundary__emoji" aria-hidden>🌑</div>
            <h1 className="error-boundary__title">Что-то пошло не так</h1>
            <p className="error-boundary__text">
              Приложение не смогло загрузиться. Попробуйте обновить страницу — ваши данные сохранены.
            </p>
            <button className="error-boundary__button" onClick={this.handleReload}>
              Обновить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
