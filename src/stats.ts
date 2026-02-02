import type { DayData } from './vkYearStorage';
import { dateKeyForDayIndex, daysInYear, MOODS } from './utils';
import type { Mood } from './utils';

export interface YearStats {
  filledDays: number;
  totalPastDays: number;
  fillPercentage: number;
  moodCounts: Record<Mood, number>;
  mostCommonMood: Mood | null;
  longestStreak: number;
  currentStreak: number;
  daysWithWord: number;
}

/**
 * Compute year statistics from a days record.
 * @param days - Record of day data keyed by date string
 * @param year - The year being analyzed
 * @param todayIndex - 1-based day index of today (0 if viewing a past year = treat all days as past)
 */
export function computeYearStats(
  days: Record<string, DayData>,
  year: number,
  todayIndex: number,
): YearStats {
  const moodCounts: Record<Mood, number> = { blue: 0, green: 0, red: 0, yellow: 0 };
  let filledDays = 0;
  let daysWithWord = 0;
  let longestStreak = 0;
  let currentRun = 0;

  const totalDays = daysInYear(year);
  // totalPastDays: for current year it's todayIndex, for past years it's all days
  const totalPastDays = todayIndex > 0 ? Math.min(todayIndex, totalDays) : totalDays;

  // Scan all past days in order
  const scanLimit = totalPastDays;
  for (let d = 1; d <= scanLimit; d++) {
    const key = dateKeyForDayIndex(year, d);
    const data = days[key];
    const hasMood = data?.mood !== undefined;

    if (hasMood) {
      filledDays++;
      moodCounts[data.mood!]++;
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      currentRun = 0;
    }

    if (data?.word) {
      daysWithWord++;
    }
  }

  // Current streak: count backwards from last scanned day
  let currentStreak = 0;
  for (let d = scanLimit; d >= 1; d--) {
    const key = dateKeyForDayIndex(year, d);
    const data = days[key];
    if (data?.mood !== undefined) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Most common mood
  let mostCommonMood: Mood | null = null;
  let maxCount = 0;
  for (const mood of MOODS) {
    if (moodCounts[mood] > maxCount) {
      maxCount = moodCounts[mood];
      mostCommonMood = mood;
    }
  }

  const fillPercentage = totalPastDays > 0 ? Math.round((filledDays / totalPastDays) * 100) : 0;

  return {
    filledDays,
    totalPastDays,
    fillPercentage,
    moodCounts,
    mostCommonMood,
    longestStreak,
    currentStreak,
    daysWithWord,
  };
}
