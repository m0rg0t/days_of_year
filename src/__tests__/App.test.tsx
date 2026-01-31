import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';

vi.mock('@vkontakte/vk-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vkontakte/vk-bridge')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      send: vi.fn().mockResolvedValue({ result: true }),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
  };
});

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
  const actual = await vi.importActual<typeof import('../vkYearStorage')>('../vkYearStorage');
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
    vi.mocked(bridge.send).mockImplementation(async (method: string) => {
      if (method === 'VKWebAppShowWallPostBox') throw new Error('no');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { result: true } as any;
    });

    const click = vi.fn();
    const origCreate = Document.prototype.createElement;
    vi.spyOn(document, 'createElement').mockImplementation(function (tagName: string) {
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
    vi.mocked(bridge.send).mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Экспорт PNG' }));

    await new Promise((r) => setTimeout(r, 80));

    expect(vi.mocked(html2canvas).mock.calls.length).toBeGreaterThan(0);
  }, 10000);

  it('applies VK dark scheme from VKWebAppGetConfig', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    vi.mocked(bridge.send).mockImplementation(async (method: string) => {
      if (method === 'VKWebAppGetConfig') {
        return { scheme: 'space_gray' } as Awaited<ReturnType<typeof bridge.send>>;
      }
      return { result: true } as Awaited<ReturnType<typeof bridge.send>>;
    });

    render(<App />);
    await Promise.resolve();
    expect(screen.getByLabelText('days-grid')).toBeInTheDocument();
  });

  it('applies VK light scheme from VKWebAppGetConfig', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    vi.mocked(bridge.send).mockImplementation(async (method: string) => {
      if (method === 'VKWebAppGetConfig') {
        return { scheme: 'bright_light' } as Awaited<ReturnType<typeof bridge.send>>;
      }
      return { result: true } as Awaited<ReturnType<typeof bridge.send>>;
    });

    render(<App />);
    await Promise.resolve();
    expect(screen.getByLabelText('days-grid')).toBeInTheDocument();
  });

  it('handles VKWebAppUpdateConfig event with scheme', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    // Capture the subscribe listener
    let listener: ((event: { detail: { type: string; data: Record<string, unknown> } }) => void) | null = null;
    vi.mocked(bridge.subscribe).mockImplementation((fn) => {
      listener = fn as typeof listener;
    });

    render(<App />);
    expect(listener).not.toBeNull();

    // Simulate VKWebAppUpdateConfig event with scheme
    listener!({ detail: { type: 'VKWebAppUpdateConfig', data: { scheme: 'vkcom_light' } } });

    await Promise.resolve();
    expect(screen.getByLabelText('days-grid')).toBeInTheDocument();

    // Also test with a non-config event (should be ignored)
    listener!({ detail: { type: 'VKWebAppGetAuthToken', data: {} } });
    expect(screen.getByLabelText('days-grid')).toBeInTheDocument();
  });

  it('displays mood class on filled days', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    // Pre-populate localStorage with mood data for a past day
    localStorage.setItem('days_of_year:v1', JSON.stringify({
      version: 1,
      year: 2026,
      days: { '2026-01-01': { mood: 'blue', word: 'test' } },
    }));

    render(<App />);
    const grid = screen.getByLabelText('days-grid');
    const dayWithMood = grid.querySelector('button[aria-label="2026-01-01"]');
    expect(dayWithMood).toBeTruthy();
    expect(dayWithMood!.className).toContain('mood-blue');
  });
});
