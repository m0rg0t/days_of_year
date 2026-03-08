import { describe, expect, it, vi } from 'vitest';
import { buildYearMarkdownReport, collectFilledEntries } from '../exportReport';
import type { YearStats } from '../stats';

describe('exportReport', () => {
  const yearStats: YearStats = {
    filledDays: 2,
    totalPastDays: 10,
    fillPercentage: 20,
    moodCounts: {
      blue: 1,
      green: 1,
      red: 0,
      yellow: 0,
    },
    mostCommonMood: 'blue',
    longestStreak: 2,
    currentStreak: 1,
    daysWithWord: 2,
  };

  it('collects only filled entries up to current day', () => {
    const entries = collectFilledEntries({
      totalDays: 365,
      todayIndex: 3,
      days: {
        '2026-01-01': { mood: 'blue', word: 'focus' },
        '2026-01-02': { word: 'win' },
        '2026-01-05': { mood: 'green' },
      },
      dateKeys: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'],
    });

    expect(entries).toEqual([
      { dateKey: '2026-01-01', dayIndex: 1, mood: 'blue', word: 'focus' },
      { dateKey: '2026-01-02', dayIndex: 2, word: 'win' },
    ]);
  });

  it('builds markdown report with summary and entries table', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T11:00:00Z'));

    const markdown = buildYearMarkdownReport({
      year: 2026,
      totalDays: 365,
      todayIndex: 10,
      days: {
        '2026-01-01': { mood: 'blue', word: 'focus' },
        '2026-01-02': { mood: 'green', word: 'ship|it' },
      },
      dateKeys: ['2026-01-01', '2026-01-02', '2026-01-03'],
      yearStats,
    });

    expect(markdown).toContain('# Дни года 2026');
    expect(markdown).toContain('- Заполнено дней: 2 из 10 (20%)');
    expect(markdown).toContain('| Спокойствие | 1 |');
    expect(markdown).toContain('ship\\|it');
    expect(markdown).toContain('| 2026-01-02 | 2 | Энергия | ship\\|it |');

    vi.useRealTimers();
  });
});
