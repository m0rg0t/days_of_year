import bridge from '@vkontakte/vk-bridge';
import type { Mood } from './utils';

export type DayData = {
  mood?: Mood;
  word?: string;
};

const KEY_PREFIX = 'doy:'; // doy:YYYY (legacy) or doy:YYYY:MM (monthly)

/** Legacy whole-year key: `doy:YYYY` */
export function yearKey(year: number) {
  return `${KEY_PREFIX}${year}`;
}

/** Monthly chunk key: `doy:YYYY:MM` (MM is zero-padded) */
export function monthKey(year: number, month: number) {
  return `${KEY_PREFIX}${year}:${String(month).padStart(2, '0')}`;
}

function safeParse(raw: string | undefined | null): Record<string, DayData> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, DayData>;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Load year data from VK Storage.
 * Reads 12 monthly keys + 1 legacy key in a single VKWebAppStorageGet call.
 * If monthly keys have data, uses them. Otherwise falls back to legacy key (migration).
 */
export async function loadYearBlobFromVk(year: number): Promise<Record<string, DayData>> {
  try {
    const monthKeys = Array.from({ length: 12 }, (_, i) => monthKey(year, i + 1));
    const legacyKey = yearKey(year);
    const allKeys = [...monthKeys, legacyKey];

    const res = await bridge.send('VKWebAppStorageGet', { keys: allKeys });
    const items = res?.keys ?? [];

    // Parse monthly chunks
    const merged: Record<string, DayData> = {};
    let hasMonthlyData = false;

    for (const mk of monthKeys) {
      const item = items.find((it) => it.key === mk);
      const parsed = safeParse(item?.value);
      if (parsed) {
        hasMonthlyData = true;
        Object.assign(merged, parsed);
      }
    }

    if (hasMonthlyData) return merged;

    // Fallback: legacy single-blob key (pre-migration data)
    const legacyItem = items.find((it) => it.key === legacyKey);
    const legacyParsed = safeParse(legacyItem?.value);
    return legacyParsed ?? {};
  } catch {
    return {};
  }
}

/** Group day entries by month number (1-12) parsed from date key `YYYY-MM-DD`. */
function groupByMonth(days: Record<string, DayData>): Map<number, Record<string, DayData>> {
  const groups = new Map<number, Record<string, DayData>>();
  for (const [key, value] of Object.entries(days)) {
    const month = parseInt(key.slice(5, 7), 10); // "YYYY-MM-DD" → MM
    if (!groups.has(month)) groups.set(month, {});
    groups.get(month)![key] = value;
  }
  return groups;
}

export function createVkYearBlobWriter(year: number) {
  let pending: Record<string, DayData> | null = null;
  let timer: number | null = null;

  async function flush() {
    timer = null;
    if (!pending) return;

    const payload = pending;
    pending = null;

    try {
      const groups = groupByMonth(payload);

      // Write each month chunk in parallel
      const writes: Promise<unknown>[] = [];
      for (const [month, monthDays] of groups) {
        writes.push(
          bridge.send('VKWebAppStorageSet', {
            key: monthKey(year, month),
            value: JSON.stringify(monthDays),
          }),
        );
      }

      // Clear legacy key to complete migration
      writes.push(
        bridge.send('VKWebAppStorageSet', {
          key: yearKey(year),
          value: '',
        }),
      );

      await Promise.all(writes);
    } catch {
      // ignore: localStorage remains fallback
    }
  }

  return {
    /**
     * Queue full-year blob update (debounced).
     * Caller passes the full year map (dateKey -> DayData).
     * Internally splits into monthly chunks for VK Storage.
     */
    setYear(days: Record<string, DayData>) {
      pending = days;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(flush, 600);
    },
  };
}
