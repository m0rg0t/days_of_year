import { describe, expect, it } from 'vitest';
import { computeYearStats } from '../stats';
import type { DayData } from '../vkYearStorage';

function makeDays(entries: [string, DayData][]): Record<string, DayData> {
  return Object.fromEntries(entries);
}

describe('computeYearStats', () => {
  it('returns zeros for empty data', () => {
    const stats = computeYearStats({}, 2026, 30);
    expect(stats.filledDays).toBe(0);
    expect(stats.totalPastDays).toBe(30);
    expect(stats.fillPercentage).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.daysWithWord).toBe(0);
    expect(stats.mostCommonMood).toBeNull();
    expect(stats.moodCounts).toEqual({ blue: 0, green: 0, red: 0, yellow: 0 });
  });

  it('counts filled days and mood distribution', () => {
    const days = makeDays([
      ['2026-01-01', { mood: 'blue' }],
      ['2026-01-02', { mood: 'blue' }],
      ['2026-01-03', { mood: 'green' }],
      ['2026-01-04', { mood: 'red', word: 'test' }],
      ['2026-01-05', { mood: 'yellow' }],
    ]);
    const stats = computeYearStats(days, 2026, 10);
    expect(stats.filledDays).toBe(5);
    expect(stats.moodCounts.blue).toBe(2);
    expect(stats.moodCounts.green).toBe(1);
    expect(stats.moodCounts.red).toBe(1);
    expect(stats.moodCounts.yellow).toBe(1);
    expect(stats.mostCommonMood).toBe('blue');
    expect(stats.daysWithWord).toBe(1);
    expect(stats.fillPercentage).toBe(50);
  });

  it('computes longest streak correctly', () => {
    // Days 1-3 filled, 4 empty, 5-9 filled
    const days = makeDays([
      ['2026-01-01', { mood: 'blue' }],
      ['2026-01-02', { mood: 'blue' }],
      ['2026-01-03', { mood: 'blue' }],
      // 4 empty
      ['2026-01-05', { mood: 'green' }],
      ['2026-01-06', { mood: 'green' }],
      ['2026-01-07', { mood: 'green' }],
      ['2026-01-08', { mood: 'green' }],
      ['2026-01-09', { mood: 'green' }],
    ]);
    const stats = computeYearStats(days, 2026, 10);
    expect(stats.longestStreak).toBe(5);
  });

  it('computes current streak (backwards from today)', () => {
    // Days 8, 9, 10 filled, today is 10
    const days = makeDays([
      ['2026-01-01', { mood: 'blue' }],
      ['2026-01-08', { mood: 'green' }],
      ['2026-01-09', { mood: 'green' }],
      ['2026-01-10', { mood: 'green' }],
    ]);
    const stats = computeYearStats(days, 2026, 10);
    expect(stats.currentStreak).toBe(3);
  });

  it('current streak is 0 if today has no mood', () => {
    const days = makeDays([
      ['2026-01-01', { mood: 'blue' }],
      ['2026-01-02', { mood: 'blue' }],
      // day 3 (today) empty
    ]);
    const stats = computeYearStats(days, 2026, 3);
    expect(stats.currentStreak).toBe(0);
  });

  it('handles past year (todayIndex=0)', () => {
    const days = makeDays([
      ['2025-01-01', { mood: 'blue' }],
      ['2025-06-15', { mood: 'red' }],
    ]);
    const stats = computeYearStats(days, 2025, 0);
    expect(stats.filledDays).toBe(2);
    expect(stats.totalPastDays).toBe(365);
  });
});
