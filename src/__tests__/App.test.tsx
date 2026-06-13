import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react';

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
    toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob(['png'], { type: 'image/png' })),
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

vi.mock('../vkPlatform', () => ({
  isDesktopWeb: vi.fn(() => true),
  getVkPlatform: vi.fn(() => 'desktop_web'),
}));

vi.mock('../storyImage', () => ({
  createStoryImageDataUrl: vi.fn(() => 'data:image/png;base64,STORY'),
}));

import { createStoryImageDataUrl } from '../storyImage';
import App from '../App';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  loadYearBlobFromVkMock.mockReset();
  setYearMock.mockReset();
  localStorage.clear();
  document.body.style.background = '';
  document.body.style.color = '';
  vi.clearAllMocks();
});

describe('App', () => {
  it('renders grid and title', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    expect(screen.getByText('Дни года')).toBeInTheDocument();
    expect(screen.getByTestId('days-grid')).toBeInTheDocument();
  });

  it('handles corrupted localStorage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    localStorage.setItem('days_of_year:v1', '{not-json');

    render(<App />);
    expect(screen.getByTestId('days-grid')).toBeInTheDocument();
  });

  it('ignores incompatible stored version', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    localStorage.setItem('days_of_year:v1', JSON.stringify({ version: 2, year: 2020, days: {}}));

    render(<App />);
    expect(screen.getByTestId('days-grid')).toBeInTheDocument();
  });

  it('clicking a day selects it (shows date in footer)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    const grid = screen.getAllByTestId('days-grid')[0];
    const first = grid.querySelector('button[data-date="2026-01-01"]');
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

    // selecting that past day should show mood editor with stored data
    const grid = screen.getAllByTestId('days-grid')[0];
    const first = grid.querySelector('button[data-date="2026-01-01"]');
    fireEvent.click(first!);
    // Past days now show the editable form, word should be in the input
    const input = screen.getByPlaceholderText('одно слово') as HTMLInputElement;
    expect(input.value).toBe('ok');
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
    fireEvent.click(screen.getByTestId('mood-blue'));
    fireEvent.click(screen.getByTestId('mood-green'));
    fireEvent.click(screen.getByTestId('mood-red'));
    fireEvent.click(screen.getByTestId('mood-yellow'));
    fireEvent.click(screen.getByTestId('mood-reset'));

    expect(setYearMock).toHaveBeenCalled();

    const input = screen.getByPlaceholderText('одно слово') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'фокус' } });
    expect(input.value).toBe('фокус');

    // export Markdown
    fireEvent.click(screen.getByText('Скачать Markdown'));

    // export PNG -> should fall back to anchor download
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Сохранить PNG' }));
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(click).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('export PNG calls html2canvas', async () => {
    // Use real timers here
    vi.mocked(bridge.send).mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить PNG' }));

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
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId('days-grid')).toBeInTheDocument();
    // jsdom normalises hex → rgb
    expect(document.body.style.background).toBe('rgb(10, 10, 10)');
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
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId('days-grid')).toBeInTheDocument();
    expect(document.body.style.background).toBe('rgb(235, 237, 240)');
    expect(document.body.style.color).toBe('rgb(26, 26, 30)');
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

    // Default is dark
    expect(document.body.style.background).toBe('rgb(10, 10, 10)');

    // Simulate VKWebAppUpdateConfig event with scheme
    act(() => {
      listener!({ detail: { type: 'VKWebAppUpdateConfig', data: { scheme: 'vkcom_light' } } });
    });

    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId('days-grid')).toBeInTheDocument();
    expect(document.body.style.background).toBe('rgb(235, 237, 240)');

    // Also test with a non-config event (should be ignored)
    listener!({ detail: { type: 'VKWebAppGetAuthToken', data: {} } });
    expect(screen.getByTestId('days-grid')).toBeInTheDocument();
  });

  it('allows mood editing for past days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    const grid = screen.getByTestId('days-grid');
    // Click a past day (Jan 5)
    const pastDay = grid.querySelector('button[data-date="2026-01-05"]');
    fireEvent.click(pastDay!);
    // Mood selector should be visible for past days
    expect(screen.getByTestId('mood-blue')).toBeInTheDocument();
    expect(screen.getByText('Что было важным?')).toBeInTheDocument();
  });

  it('shows read-only view for future days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    const grid = screen.getByTestId('days-grid');
    // Click a future day (Feb 15)
    const futureDay = grid.querySelector('button[data-date="2026-02-15"]');
    fireEvent.click(futureDay!);
    // Should show read-only trace, not mood selector
    expect(screen.queryByTestId('mood-blue')).toBeNull();
    expect(screen.getAllByText(/настроение: —/)[0]).toBeInTheDocument();
  });

  it('shows "Что сегодня было важным?" for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    // Today is selected by default
    expect(screen.getByText('Что сегодня было важным?')).toBeInTheDocument();
  });

  it('year navigation: clicking ← goes to previous year', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    expect(screen.getByText('2026')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('prev-year'));
    });

    expect(screen.getByText('2025')).toBeInTheDocument();
    // Grid should re-render with 2025 days
    const grid = screen.getByTestId('days-grid');
    const archivedDay = grid.querySelector('button[data-date="2025-06-01"]');
    expect(archivedDay).toBeTruthy();
    // An archived (fully past) year renders every day as lived/filled, not empty.
    expect(archivedDay!.className).toContain('day-grid__dot--filled');
  });

  it('year navigation: → is disabled for current year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    const nextBtn = screen.getByTestId('next-year');
    expect(nextBtn).toBeDisabled();
  });

  it('year navigation: progress bar hidden for non-current year', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    expect(document.querySelector('.year-nav__progress')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId('prev-year'));
    });

    expect(document.querySelector('.year-nav__progress')).toBeNull();
  });

  it('shows quote block for selected day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    const quoteBlock = screen.getByTestId('quote-block');
    expect(quoteBlock).toBeInTheDocument();
    expect(quoteBlock.textContent!.length).toBeGreaterThan(0);
  });

  it('shows month quick jumps on mobile and jumps to month start', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });

    try {
      render(<App />);
      fireEvent.click(screen.getByTestId('jump-month-8'));
      expect(screen.getByText(/2026-08-01/)).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: originalInnerWidth });
    }
  });

  it('stats toggle shows and hides stats panel', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    // On mobile, stats start collapsed
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });

    try {
      render(<App />);
      // Stats panel hidden initially on mobile
      expect(screen.queryByTestId('stats-panel')).toBeNull();

      // Click toggle to show
      fireEvent.click(screen.getByTestId('stats-toggle'));
      expect(screen.getByTestId('stats-panel')).toBeInTheDocument();
      expect(screen.getByTestId('badges-row')).toBeInTheDocument();

      // Click toggle to hide
      fireEvent.click(screen.getByTestId('stats-toggle'));
      expect(screen.queryByTestId('stats-panel')).toBeNull();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: originalInnerWidth });
    }
  });

  it('stats panel shows correct data with filled days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    localStorage.setItem('days_of_year:v1', JSON.stringify({
      version: 1,
      year: 2026,
      days: {
        '2026-01-01': { mood: 'blue', word: 'test' },
        '2026-01-02': { mood: 'green' },
        '2026-01-03': { mood: 'blue' },
      },
    }));

    render(<App />);
    // On desktop (default test env), stats are open by default — no toggle needed
    expect(screen.getByText(/3 \/ 30/)).toBeInTheDocument();
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
    const grid = screen.getByTestId('days-grid');
    const dayWithMood = grid.querySelector('button[data-date="2026-01-01"]');
    expect(dayWithMood).toBeTruthy();
    expect(dayWithMood!.className).toContain('mood-blue');
  });

  it('shows export buttons even when not on desktop_web', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    const { isDesktopWeb } = await import('../vkPlatform');
    vi.mocked(isDesktopWeb).mockReturnValue(false);

    render(<App />);
    expect(screen.getByText('Сохранить PNG')).toBeInTheDocument();
    expect(screen.getByText('Скачать Markdown')).toBeInTheDocument();
    expect(screen.getByText('Поделиться')).toBeInTheDocument();

    vi.mocked(isDesktopWeb).mockReturnValue(true);
  });

  it('VK Storage data takes priority over localStorage', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    localStorage.setItem('days_of_year:v1', JSON.stringify({
      version: 1,
      year: 2026,
      days: { '2026-01-01': { mood: 'blue', word: 'local' } },
    }));

    loadYearBlobFromVkMock.mockResolvedValueOnce({
      '2026-01-01': { mood: 'green', word: 'vk' },
    });

    render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const grid = screen.getByTestId('days-grid');
    const first = grid.querySelector('button[data-date="2026-01-01"]');
    fireEvent.click(first!);

    const input = screen.getByPlaceholderText('одно слово') as HTMLInputElement;
    expect(input.value).toBe('vk');
  });

  it('uses localStorage when VK Storage returns empty', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    localStorage.setItem('days_of_year:v1', JSON.stringify({
      version: 1,
      year: 2026,
      days: { '2026-01-01': { mood: 'red', word: 'fallback' } },
    }));

    loadYearBlobFromVkMock.mockResolvedValueOnce({});

    render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const grid = screen.getByTestId('days-grid');
    const first = grid.querySelector('button[data-date="2026-01-01"]');
    fireEvent.click(first!);

    const input = screen.getByPlaceholderText('одно слово') as HTMLInputElement;
    expect(input.value).toBe('fallback');
  });

  it('shares the year to a VK story via VKWebAppShowStoryBox', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByText('Поделиться в историю'));
      await Promise.resolve();
    });

    expect(vi.mocked(createStoryImageDataUrl)).toHaveBeenCalled();
    expect(
      vi.mocked(bridge.send).mock.calls.some((c) => c[0] === 'VKWebAppShowStoryBox'),
    ).toBe(true);
  });

  it('skips story share when no image data is produced', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    vi.mocked(createStoryImageDataUrl).mockReturnValueOnce(null);

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByText('Поделиться в историю'));
      await Promise.resolve();
    });

    expect(
      vi.mocked(bridge.send).mock.calls.some((c) => c[0] === 'VKWebAppShowStoryBox'),
    ).toBe(false);
  });

  it('opens the day modal on mobile by re-tapping the selected day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });

    try {
      render(<App />);
      const grid = screen.getByTestId('days-grid');
      const day = grid.querySelector('button[title="2026-01-05"]') as HTMLButtonElement;
      expect(day).toBeTruthy();

      // First tap selects, second tap opens the modal.
      fireEvent.click(day);
      fireEvent.click(day);

      expect(screen.getByText('Готово')).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: originalInnerWidth });
    }
  });

  it('opens the day modal on mobile via the Открыть button', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });

    try {
      render(<App />);
      fireEvent.click(screen.getByText('Открыть'));
      expect(screen.getByText('Готово')).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: originalInnerWidth });
    }
  });

  it('shares the app link via VKWebAppShare', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    render(<App />);
    fireEvent.click(screen.getByText('Поделиться'));

    expect(
      vi.mocked(bridge.send).mock.calls.some((c) => c[0] === 'VKWebAppShare'),
    ).toBe(true);
  });

  it('writes only current year data to VK Storage writer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    localStorage.setItem('days_of_year:v1', JSON.stringify({
      version: 1,
      year: 2026,
      days: {
        '2025-12-31': { word: 'old-year' },
        '2026-01-01': { word: 'current-year' },
      },
    }));

    render(<App />);

    const input = screen.getByPlaceholderText('одно слово') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'updated' } });

    expect(setYearMock).toHaveBeenCalledWith(expect.objectContaining({
      '2026-01-30': { word: 'updated' },
    }));
    expect(setYearMock.mock.calls.at(-1)?.[0]).not.toHaveProperty('2025-12-31');
  });
});
