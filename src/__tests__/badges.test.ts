import { describe, expect, it } from 'vitest';
import { getEarnedBadges, BADGE_DEFS } from '../badges';
import type { YearStats } from '../stats';

function makeStats(overrides: Partial<YearStats> = {}): YearStats {
  return {
    filledDays: 0,
    totalPastDays: 30,
    fillPercentage: 0,
    moodCounts: { blue: 0, green: 0, red: 0, yellow: 0 },
    mostCommonMood: null,
    longestStreak: 0,
    currentStreak: 0,
    daysWithWord: 0,
    ...overrides,
  };
}

describe('badges', () => {
  it('has 6 badge definitions', () => {
    expect(BADGE_DEFS.length).toBe(6);
  });

  it('empty stats → no badges earned', () => {
    const badges = getEarnedBadges(makeStats());
    expect(badges.every((b) => !b.earned)).toBe(true);
  });

  it('first-day badge earned with 1 filled day', () => {
    const badges = getEarnedBadges(makeStats({ filledDays: 1 }));
    const firstDay = badges.find((b) => b.id === 'first-day');
    expect(firstDay?.earned).toBe(true);
  });

  it('week-streak badge earned with streak >= 7', () => {
    const badges = getEarnedBadges(makeStats({ filledDays: 7, longestStreak: 7 }));
    const weekStreak = badges.find((b) => b.id === 'week-streak');
    expect(weekStreak?.earned).toBe(true);
  });

  it('month-streak badge earned with streak >= 30', () => {
    const badges = getEarnedBadges(makeStats({ filledDays: 30, longestStreak: 30 }));
    const monthStreak = badges.find((b) => b.id === 'month-streak');
    expect(monthStreak?.earned).toBe(true);
  });

  it('hundred-days badge earned with 100 filled days', () => {
    const badges = getEarnedBadges(makeStats({ filledDays: 100 }));
    const hundred = badges.find((b) => b.id === 'hundred-days');
    expect(hundred?.earned).toBe(true);
  });

  it('half-year badge earned with 183 filled days', () => {
    const badges = getEarnedBadges(makeStats({ filledDays: 183 }));
    const halfYear = badges.find((b) => b.id === 'half-year');
    expect(halfYear?.earned).toBe(true);
  });

  it('full-year badge earned with 365 filled days', () => {
    const badges = getEarnedBadges(makeStats({ filledDays: 365 }));
    const fullYear = badges.find((b) => b.id === 'full-year');
    expect(fullYear?.earned).toBe(true);
  });

  it('maximal stats → all badges earned', () => {
    const badges = getEarnedBadges(makeStats({
      filledDays: 365,
      longestStreak: 365,
      currentStreak: 365,
    }));
    expect(badges.every((b) => b.earned)).toBe(true);
  });

  it('each badge has required fields', () => {
    const badges = getEarnedBadges(makeStats());
    for (const b of badges) {
      expect(b.id).toBeTruthy();
      expect(b.emoji).toBeTruthy();
      expect(b.title).toBeTruthy();
      expect(b.description).toBeTruthy();
      expect(typeof b.earned).toBe('boolean');
    }
  });
});
