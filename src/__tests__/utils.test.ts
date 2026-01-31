import { describe, expect, it, vi } from 'vitest';
import { dateKeyForDayIndex, dayOfYear, daysInYear, isLeapYear, downloadText, monthStartIndices } from '../utils';

describe('utils', () => {
  it('isLeapYear', () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
  });

  it('daysInYear', () => {
    expect(daysInYear(2024)).toBe(366);
    expect(daysInYear(2025)).toBe(365);
  });

  it('dayOfYear is 1-based', () => {
    expect(dayOfYear(new Date('2026-01-01T12:00:00Z'))).toBe(1);
    expect(dayOfYear(new Date('2026-12-31T12:00:00Z'))).toBe(365);
  });

  it('dateKeyForDayIndex', () => {
    expect(dateKeyForDayIndex(2026, 1)).toBe('2026-01-01');
    expect(dateKeyForDayIndex(2026, 32)).toBe('2026-02-01');
    expect(dateKeyForDayIndex(2024, 60)).toBe('2024-02-29');
  });

  it('downloadText creates a downloadable link', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    // @ts-expect-error test override
    globalThis.URL.createObjectURL = createObjectURL;
    // @ts-expect-error test override
    globalThis.URL.revokeObjectURL = revokeObjectURL;

    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, 'appendChild');

    // Spy on createElement so we can intercept the anchor
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreate(tagName);
      if (tagName === 'a') {
        // @ts-expect-error add mock
        el.click = click;
      }
      return el;
    });

    downloadText('x.json', '{"a":1}');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it('monthStartIndices returns 12 entries', () => {
    const map = monthStartIndices(2026);
    expect(map.size).toBe(12);
    // Jan always starts at day 1
    expect(map.get(1)).toBe('Янв');
    // Feb starts at day 32 for non-leap year
    expect(map.get(32)).toBe('Фев');
  });

  it('monthStartIndices handles leap year', () => {
    const map = monthStartIndices(2024);
    expect(map.size).toBe(12);
    // Mar starts at day 61 in leap year (31+29+1)
    expect(map.get(61)).toBe('Мар');
  });
});
