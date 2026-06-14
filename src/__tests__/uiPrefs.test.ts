import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGridDensity, saveGridDensity } from '../uiPrefs';

const KEY = 'days_of_year:grid_density';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('uiPrefs grid density', () => {
  it('defaults to comfortable when nothing is stored', () => {
    expect(loadGridDensity()).toBe('comfortable');
  });

  it('returns a valid stored value', () => {
    localStorage.setItem(KEY, 'compact');
    expect(loadGridDensity()).toBe('compact');
    localStorage.setItem(KEY, 'comfortable');
    expect(loadGridDensity()).toBe('comfortable');
  });

  it('ignores an invalid stored value (falls back to comfortable)', () => {
    localStorage.setItem(KEY, 'nonsense');
    expect(loadGridDensity()).toBe('comfortable');
  });

  it('persists a chosen density', () => {
    saveGridDensity('compact');
    expect(localStorage.getItem(KEY)).toBe('compact');
  });

  it('falls back to comfortable if localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadGridDensity()).toBe('comfortable');
  });

  it('swallows errors when saving', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveGridDensity('comfortable')).not.toThrow();
  });
});
