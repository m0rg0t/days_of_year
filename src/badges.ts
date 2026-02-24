import type { YearStats } from './stats';

interface BadgeDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  check: (stats: YearStats) => boolean;
  /** The stat field and numeric target used by `check`, for progress display. */
  threshold: { field: 'filledDays' | 'longestStreak'; value: number };
}

export interface Badge extends BadgeDef {
  earned: boolean;
}

export const BADGE_DEFS: BadgeDef[] = [
  {
    id: 'first-day',
    emoji: '🌱',
    title: 'Первый день',
    description: '1 день с настроением',
    check: (s) => s.filledDays >= 1,
    threshold: { field: 'filledDays', value: 1 },
  },
  {
    id: 'week-streak',
    emoji: '🔥',
    title: 'Первая неделя',
    description: 'Стрик 7 дней',
    check: (s) => s.longestStreak >= 7,
    threshold: { field: 'longestStreak', value: 7 },
  },
  {
    id: 'month-streak',
    emoji: '🏅',
    title: 'Месяц',
    description: 'Стрик 30 дней',
    check: (s) => s.longestStreak >= 30,
    threshold: { field: 'longestStreak', value: 30 },
  },
  {
    id: 'hundred-days',
    emoji: '💯',
    title: '100 дней',
    description: '100 заполненных дней',
    check: (s) => s.filledDays >= 100,
    threshold: { field: 'filledDays', value: 100 },
  },
  {
    id: 'half-year',
    emoji: '⭐',
    title: 'Полгода',
    description: '183 заполненных дня',
    check: (s) => s.filledDays >= 183,
    threshold: { field: 'filledDays', value: 183 },
  },
  {
    id: 'full-year',
    emoji: '🏆',
    title: 'Полный год',
    description: '365 заполненных дней',
    check: (s) => s.filledDays >= 365,
    threshold: { field: 'filledDays', value: 365 },
  },
];

export function getEarnedBadges(stats: YearStats): Badge[] {
  return BADGE_DEFS.map((def) => ({
    ...def,
    earned: def.check(stats),
  }));
}
