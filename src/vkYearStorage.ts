import bridge from '@vkontakte/vk-bridge';
import type { DayData } from './vkStorage';

const KEY_PREFIX = 'doy:'; // doy:YYYY

export function yearKey(year: number) {
  return `${KEY_PREFIX}${year}`;
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

export async function loadYearBlobFromVk(year: number): Promise<Record<string, DayData>> {
  try {
    const res = await bridge.send('VKWebAppStorageGet', { keys: [yearKey(year)] } as any);
    const items = (res?.keys || []) as Array<{ key: string; value: string }>;
    const item = items.find((it) => it.key === yearKey(year));
    const parsed = safeParse(item?.value);
    return parsed || {};
  } catch {
    return {};
  }
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
      await bridge.send('VKWebAppStorageSet', {
        key: yearKey(year),
        value: JSON.stringify(payload),
      } as any);
    } catch {
      // ignore: localStorage remains fallback
    }
  }

  return {
    /**
     * Queue full-year blob update (debounced).
     * Caller passes the full year map (dateKey -> DayData).
     */
    setYear(days: Record<string, DayData>) {
      pending = days;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(flush, 600);
    },
  };
}
