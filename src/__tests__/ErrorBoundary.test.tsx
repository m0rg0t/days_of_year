import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary/ErrorBoundary';

function Boom(): never {
  throw new Error('kaboom');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>всё хорошо</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('всё хорошо')).toBeInTheDocument();
  });

  it('shows the Russian fallback when a child throws', () => {
    // Suppress React's expected error logging for this render.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
    expect(screen.getByText('Обновить')).toBeInTheDocument();
  });

  it('reloads the page when the button is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByText('Обновить'));
    expect(reload).toHaveBeenCalled();
  });
});
