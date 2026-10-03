import { describe, expect, it, vi } from 'vitest';
import { emptyStore, getYearDays, loadStore, patchStoreDay, replaceYearDays, saveStore, STORAGE_KEY } from '../localStore';

describe('localStore', () => {
  it('emptyStore shape', () => {
    const s = emptyStore(2026);
    expect(s.version).toBe(1);
    expect(s.year).toBe(2026);
    expect(s.days).toEqual({});
  });

  it('loadStore returns empty on missing', () => {
    localStorage.removeItem(STORAGE_KEY);
    const s = loadStore(2026);
    expect(s.year).toBe(2026);
    expect(s.days).toEqual({});
  });

  it('loadStore returns empty on invalid json', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    const s = loadStore(2026);
    expect(s.days).toEqual({});
  });

  it('loadStore returns empty on wrong version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, year: 2020, days: {} }));
    const s = loadStore(2026);
    expect(s.year).toBe(2026);
    expect(s.days).toEqual({});
  });

  it('saveStore roundtrip', () => {
    const s = emptyStore(2026);
    s.days['2026-01-01'] = { word: 'x' };
    saveStore(s);

    const loaded = loadStore(2026);
    expect(loaded.days['2026-01-01']?.word).toBe('x');
  });

  it('getYearDays filters records to selected year', () => {
    const days = {
      '2025-12-31': { word: 'old' },
      '2026-01-01': { word: 'new' },
    };

    expect(getYearDays(days, 2026)).toEqual({
      '2026-01-01': { word: 'new' },
    });
  });

  it('replaceYearDays only replaces one year slice', () => {
    const store = {
      version: 1 as const,
      year: 2026,
      days: {
        '2025-12-31': { word: 'keep' },
        '2026-01-01': { word: 'replace' },
      },
    };

    const next = replaceYearDays(store, 2026, {
      '2026-02-01': { word: 'fresh' },
    });

    expect(next.days).toEqual({
      '2025-12-31': { word: 'keep' },
      '2026-02-01': { word: 'fresh' },
    });
  });

  it('patchStoreDay removes empty entries', () => {
    const store = {
      version: 1 as const,
      year: 2026,
      days: {
        '2026-01-01': { word: 'focus' },
      },
    };

    const next = patchStoreDay(store, '2026-01-01', { word: '' });
    expect(next.days['2026-01-01']).toBeUndefined();
  });
});


it('rejects incomplete or array-shaped stored day maps', () => {
  for (const days of [undefined, null, [], 'invalid']) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, year: 2026, days }));
    expect(loadStore(2026)).toEqual(emptyStore(2026));
  }
});

it('blocked browser storage does not throw away the in-memory edit', () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const store = { ...emptyStore(2026), days: { '2026-01-01': { word: 'synthetic' } } };
  expect(saveStore(store)).toBe(false);
  expect(store.days['2026-01-01'].word).toBe('synthetic');
  setItem.mockRestore();
});
