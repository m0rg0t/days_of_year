import { describe, expect, it } from 'vitest';
import { emptyStore, loadStore, saveStore, STORAGE_KEY } from '../localStore';

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
});
