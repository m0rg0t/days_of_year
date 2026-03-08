import type { DayData } from './vkYearStorage';

export type Store = {
  version: 1;
  year: number;
  days: Record<string, DayData>; // key: YYYY-MM-DD
};

export const STORAGE_KEY = 'days_of_year:v1';

export function emptyStore(year: number): Store {
  return { version: 1, year, days: {} };
}

export function loadStore(year: number): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore(year);

    const parsed = JSON.parse(raw) as Store;
    if (!parsed || parsed.version !== 1) return emptyStore(year);

    // Keep historical data even if year changes
    return { ...parsed, year };
  } catch {
    return emptyStore(year);
  }
}

export function saveStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getYearDays(days: Record<string, DayData>, year: number): Record<string, DayData> {
  const prefix = `${year}-`;
  return Object.fromEntries(Object.entries(days).filter(([dateKey]) => dateKey.startsWith(prefix)));
}

export function isDayDataEmpty(day: DayData | undefined): boolean {
  return !day?.mood && !day?.word?.trim();
}

export function replaceYearDays(store: Store, year: number, yearDays: Record<string, DayData>): Store {
  const nextDays = { ...store.days };

  for (const dateKey of Object.keys(nextDays)) {
    if (dateKey.startsWith(`${year}-`)) {
      delete nextDays[dateKey];
    }
  }

  for (const [dateKey, day] of Object.entries(yearDays)) {
    if (!isDayDataEmpty(day)) {
      nextDays[dateKey] = day;
    }
  }

  return {
    ...store,
    year,
    days: nextDays,
  };
}

export function patchStoreDay(store: Store, key: string, patch: Partial<DayData>): Store {
  const currentDay = store.days[key] || {};
  const nextDay: DayData = { ...currentDay, ...patch };
  const nextDays = { ...store.days };

  if (isDayDataEmpty(nextDay)) {
    delete nextDays[key];
  } else {
    nextDays[key] = nextDay;
  }

  return {
    ...store,
    days: nextDays,
  };
}
