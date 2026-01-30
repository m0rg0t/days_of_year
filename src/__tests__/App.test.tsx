import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@vkontakte/vk-bridge', () => ({
  default: {
    send: vi.fn().mockResolvedValue({ result: true }),
    subscribe: vi.fn(() => () => {}),
  },
}));

import bridge from '@vkontakte/vk-bridge';

vi.mock('html2canvas', () => ({
  default: vi.fn(async () => ({
    toDataURL: () => 'data:image/png;base64,xxx',
  })),
}));

import html2canvas from 'html2canvas';

// Keep VK storage/ad helpers controllable in tests (must be hoisted)
const { loadYearBlobFromVkMock, setYearMock } = vi.hoisted(() => {
  return {
    loadYearBlobFromVkMock: vi.fn(async () => ({})),
    setYearMock: vi.fn(),
  };
});

vi.mock('../vkYearStorage', async () => {
  const actual = await vi.importActual<any>('../vkYearStorage');
  return {
    ...actual,
    loadYearBlobFromVk: loadYearBlobFromVkMock,
    createVkYearBlobWriter: vi.fn(() => ({ setYear: setYearMock })),
  };
});

vi.mock('../vkAds', () => ({
  showBannerAd: vi.fn(async () => ({ result: true })),
  hideBannerAd: vi.fn(async () => true),
}));

import App from '../App';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  loadYearBlobFromVkMock.mockReset();
  setYearMock.mockReset();
  localStorage.clear();
  vi.clearAllMocks();
});

describe('App', () => {
  it('renders grid and title', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    expect(screen.getByText('Дни года')).toBeInTheDocument();
    expect(screen.getByLabelText('days-grid')).toBeInTheDocument();
  });

  it('handles corrupted localStorage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    localStorage.setItem('days_of_year:v1', '{not-json');

    render(<App />);
    expect(screen.getByLabelText('days-grid')).toBeInTheDocument();
  });

  it('ignores incompatible stored version', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    localStorage.setItem('days_of_year:v1', JSON.stringify({ version: 2, year: 2020, days: {}}));

    render(<App />);
    expect(screen.getByLabelText('days-grid')).toBeInTheDocument();
  });

  it('clicking a day selects it (shows date in footer)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    const grid = screen.getAllByLabelText('days-grid')[0];
    const first = grid.querySelector('button[aria-label="2026-01-01"]');
    expect(first).toBeTruthy();
    fireEvent.click(first!);
    expect(screen.getByText('2026-01-01')).toBeInTheDocument();
  });

  it('hydrates from VK year blob', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    loadYearBlobFromVkMock.mockResolvedValueOnce({
      '2026-01-01': { mood: 'green', word: 'ok' },
    });

    render(<App />);

    // allow hydration effect to run
    await Promise.resolve();
    await Promise.resolve();

    // selecting that day should show stored trace
    const grid = screen.getAllByLabelText('days-grid')[0];
    const first = grid.querySelector('button[aria-label="2026-01-01"]');
    fireEvent.click(first!);
    expect(screen.getByText(/слово: ok/)).toBeInTheDocument();
  });

  it('can set today mood and word and export (fallback download)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    // make wall post fail so exportPng falls back to local download
    (bridge.send as any).mockImplementation(async (method: string) => {
      if (method === 'VKWebAppShowWallPostBox') throw new Error('no');
      return { result: true };
    });

    const click = vi.fn();
    const origCreate = Document.prototype.createElement;
    vi.spyOn(document, 'createElement').mockImplementation(function (tagName: any) {
      const el = origCreate.call(this, tagName);
      if (tagName === 'a') {
        // @ts-expect-error mock
        el.click = click;
      }
      return el;
    });

    render(<App />);

    // mood buttons should be visible for today
    fireEvent.click(screen.getByText('🔵'));
    fireEvent.click(screen.getByText('🟢'));
    fireEvent.click(screen.getByText('🔴'));
    fireEvent.click(screen.getByText('🟡'));
    fireEvent.click(screen.getByText('сброс'));

    expect(setYearMock).toHaveBeenCalled();

    const input = screen.getByPlaceholderText('одно слово') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'фокус' } });
    expect(input.value).toBe('фокус');

    // export JSON
    fireEvent.click(screen.getByText('Экспорт JSON'));

    // export PNG -> should fall back to anchor download
    fireEvent.click(screen.getByRole('button', { name: 'Экспорт PNG' }));

    expect(click).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('export PNG calls html2canvas', async () => {
    // Use real timers here
    (bridge.send as any).mockResolvedValue({ result: true });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Экспорт PNG' }));

    await new Promise((r) => setTimeout(r, 80));

    expect((html2canvas as any).mock.calls.length).toBeGreaterThan(0);
  }, 10000);
});
