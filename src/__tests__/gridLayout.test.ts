import { describe, expect, it } from 'vitest';
import { computeBestLayout } from '../gridLayout';

describe('gridLayout', () => {
  it('returns a fallback when box is tiny', () => {
    const layout = computeBestLayout({ totalDays: 365, width: 10, height: 10 });
    expect(layout.cell).toBeGreaterThanOrEqual(8);
    expect(layout.cols).toBeGreaterThan(0);
  });

  it('prefers larger cells when enough space', () => {
    const a = computeBestLayout({ totalDays: 365, width: 360, height: 640 });
    const b = computeBestLayout({ totalDays: 365, width: 720, height: 720 });
    expect(b.cell).toBeGreaterThanOrEqual(a.cell);
  });

  it('uses smaller gap on narrow screens', () => {
    const layout = computeBestLayout({ totalDays: 365, width: 400, height: 800 });
    expect(layout.gap).toBe(4);
  });

  it('uses default gap on wide screens', () => {
    const layout = computeBestLayout({ totalDays: 365, width: 600, height: 800 });
    expect(layout.gap).toBe(6);
  });
});
