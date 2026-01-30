import bridge from '@vkontakte/vk-bridge';
import type { Mood } from './utils';

export type DayData = {
  mood?: Mood;
  word?: string;
};

const KEY_PREFIX = 'doy:'; // doy:YYYY-MM-DD

function keyForDate(dateKey: string) {
  return `${KEY_PREFIX}${dateKey}`;
}

function safeParseDayData(raw: string | undefined | null): DayData | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as DayData;
    if (!v || typeof v !== 'object') return null;
    return v;
  } catch {
    return null;
  }
}

/**
 * Load all stored day keys for a given year from VK Storage.
 * Uses GetKeys + batched Get to minimize calls.
 */
export async function loadYearFromVkStorage(year: number): Promise<Record<string, DayData>> {
  // If not running inside VK, bridge calls will fail.
  // We'll just return empty and let localStorage be the fallback.
  try {
    // fetch keys in pages
    const keys: string[] = [];
    const pageSize = 1000;

    for (let offset = 0; offset < 5000; offset += pageSize) {
      const res = await bridge.send('VKWebAppStorageGetKeys', {
        count: pageSize,
        offset,
      } as any);

      const batch = (res?.keys || []) as string[];
      if (!batch.length) break;
      keys.push(...batch);
      if (batch.length < pageSize) break;
    }

    const yearPrefix = `${KEY_PREFIX}${year}-`;
    const yearKeys = keys.filter((k) => k.startsWith(yearPrefix));

    const out: Record<string, DayData> = {};

    // VKWebAppStorageGet supports keys: string[]
    const chunkSize = 100;
    for (let i = 0; i < yearKeys.length; i += chunkSize) {
      const chunk = yearKeys.slice(i, i + chunkSize);
      const res = await bridge.send('VKWebAppStorageGet', { keys: chunk } as any);
      const items = (res?.keys || []) as Array<{ key: string; value: string }>;
      for (const it of items) {
        const dateKey = it.key.replace(KEY_PREFIX, '');
        const data = safeParseDayData(it.value);
        if (data) out[dateKey] = data;
      }
    }

    return out;
  } catch {
    return {};
  }
}

/**
 * Best-effort write to VK Storage (and allow localStorage to be the mirror).
 * Debounced/coalesced to avoid hitting rate limits.
 */
export function createVkStorageWriter() {
  const pending = new Map<string, string>();
  let timer: number | null = null;

  async function flush() {
    timer = null;
    const entries = Array.from(pending.entries());
    pending.clear();

    for (const [k, v] of entries) {
      try {
        await bridge.send('VKWebAppStorageSet', { key: k, value: v } as any);
      } catch {
        // ignore: localStorage remains source of truth when VK Storage fails
      }
    }
  }

  return {
    setDay(dateKey: string, data: DayData) {
      const k = keyForDate(dateKey);
      const v = JSON.stringify(data);
      pending.set(k, v);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(flush, 400);
    },
  };
}
