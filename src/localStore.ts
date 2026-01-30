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
