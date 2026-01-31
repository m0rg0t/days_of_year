import { describe, expect, it } from 'vitest';
import { QUOTES, getQuoteForDate } from '../quotes';

describe('quotes', () => {
  it('has at least 365 quotes', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(365);
  });

  it('all quotes are non-empty strings', () => {
    for (const q of QUOTES) {
      expect(typeof q).toBe('string');
      expect(q.length).toBeGreaterThan(0);
    }
  });

  it('getQuoteForDate is deterministic', () => {
    const q1 = getQuoteForDate('2026-01-15');
    const q2 = getQuoteForDate('2026-01-15');
    expect(q1).toBe(q2);
  });

  it('different dates produce different quotes (most of the time)', () => {
    const quotes = new Set<string>();
    for (let d = 1; d <= 30; d++) {
      const key = `2026-01-${String(d).padStart(2, '0')}`;
      quotes.add(getQuoteForDate(key));
    }
    // At least 20 out of 30 should be distinct (with 365+ quotes, collisions rare)
    expect(quotes.size).toBeGreaterThanOrEqual(20);
  });

  it('returns a string from the QUOTES array', () => {
    const q = getQuoteForDate('2026-06-15');
    expect(QUOTES).toContain(q);
  });
});
