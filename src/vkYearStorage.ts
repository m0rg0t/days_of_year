import { vkBridgeService } from './vkBridge';
import type { Mood } from './utils';

export type DayData = {
  mood?: Mood;
  word?: string;
};

export type VkSyncState = {
  status: 'idle' | 'saving' | 'saved' | 'error';
  savedAt?: number;
};

// VK Storage keys may only contain [a-zA-Z0-9_-] (max 100 chars) — colons are
// rejected, so the separator is an underscore, not ":".
const KEY_PREFIX = 'doy_'; // doy_YYYY (legacy) or doy_YYYY_MM (monthly)

/** Legacy whole-year key: `doy_YYYY` */
export function yearKey(year: number) {
  return `${KEY_PREFIX}${year}`;
}

/** Monthly chunk key: `doy_YYYY_MM` (MM is zero-padded) */
export function monthKey(year: number, month: number) {
  return `${KEY_PREFIX}${year}_${String(month).padStart(2, '0')}`;
}

function safeParse(raw: string | undefined | null): Record<string, DayData> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, DayData>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
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
  return (await loadYearBlobWithStatusFromVk(year)).days;
}

export async function loadYearBlobWithStatusFromVk(year: number): Promise<{ days: Record<string, DayData>; confirmed: boolean }> {
  try {
    const monthKeys = Array.from({ length: 12 }, (_, i) => monthKey(year, i + 1));
    const legacyKey = yearKey(year);
    const allKeys = [...monthKeys, legacyKey];

    const res = await vkBridgeService.storageGet(allKeys);
    const items = Array.isArray(res?.keys) ? res.keys : [];
    const confirmed = allKeys.every((key) => items.some((item) => item?.key === key && typeof item.value === 'string'));

    // A previous migration may have written only some months. Preserve all
    // unmigrated legacy months; a completed monthly chunk replaces that month.
    const legacyItem = items.find((it) => it?.key === legacyKey);
    const merged = { ...(safeParse(legacyItem?.value) ?? {}) };
    for (const [index, mk] of monthKeys.entries()) {
      const item = items.find((it) => it?.key === mk);
      const parsed = safeParse(item?.value);
      if (!parsed) continue;
      const prefix = `${year}-${String(index + 1).padStart(2, '0')}-`;
      for (const key of Object.keys(merged)) {
        if (key.startsWith(prefix)) delete merged[key];
      }
      Object.assign(merged, parsed);
    }
    return { days: merged, confirmed };
  } catch {
    return { days: {}, confirmed: false };
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

type VkYearBlobWriterOptions = {
  onStateChange?: (state: VkSyncState) => void;
};

export function createVkYearBlobWriter(year: number, options: VkYearBlobWriterOptions = {}) {
  let pending: Record<string, DayData> | null = null;
  let timer: number | null = null;
  // Last value string successfully written per month, so each flush only
  // re-sends months whose content actually changed (instead of 13 writes per
  // edit, which would hammer VK Storage's per-user write rate limit).
  const lastWritten = new Map<number, string>();
  let legacyCleared = false;
  let flushing = false;

  async function flush() {
    timer = null;
    if (!pending || flushing) return;
    flushing = true;

    const payload = pending;
    pending = null;

    try {
      const groups = groupByMonth(payload);

      // The service resolves failures to null (it never rejects), so a write
      // "succeeded" only when the resolved value has result:true.
      const writes: Array<{ apply: () => void; promise: Promise<{ result: boolean } | null> }> = [];

      for (let month = 1; month <= 12; month++) {
        const monthDays = groups.get(month) ?? null;
        const value = monthDays ? JSON.stringify(monthDays) : '';
        // Skip unchanged months (including empty months never written before).
        if (value === (lastWritten.get(month) ?? '')) continue;
        writes.push({
          apply: () => lastWritten.set(month, value),
          promise: vkBridgeService.storageSet(monthKey(year, month), value),
        });
      }

      // allSettled so one throttled/failed write doesn't discard the others;
      // only mark a month as written when its own write succeeds (failures retry).
      const results = await Promise.allSettled(writes.map((w) => w.promise));
      let anyFailed = false;
      results.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value?.result) writes[i].apply();
        else anyFailed = true;
      });

      // Clear legacy only after every monthly write is confirmed. Clearing it
      // concurrently could permanently discard a throttled/failed month.
      if (!anyFailed && !legacyCleared) {
        const cleared = await vkBridgeService.storageSet(yearKey(year), '');
        legacyCleared = cleared?.result === true;
        anyFailed = !legacyCleared;
      }
      options.onStateChange?.(
        anyFailed ? { status: 'error' } : pending ? { status: 'saving' } : { status: 'saved', savedAt: Date.now() },
      );
    } catch {
      options.onStateChange?.({ status: 'error' });
      // ignore: localStorage remains fallback
    } finally {
      flushing = false;
      // Serialize writes so an older slow save cannot overwrite a newer edit.
      if (pending && timer === null) timer = window.setTimeout(flush, 600);
    }
  }

  return {
    /**
     * Queue full-year blob update (debounced).
     * Caller passes the full year map (dateKey -> DayData).
     * Splits into monthly chunks and writes only the months that changed since
     * the last successful flush.
     */
    setYear(days: Record<string, DayData>) {
      pending = days;
      if (timer) window.clearTimeout(timer);
      options.onStateChange?.({ status: 'saving' });
      timer = window.setTimeout(flush, 600);
    },
  };
}

