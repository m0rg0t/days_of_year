import { describe, expect, it } from 'vitest';
import { computeBestLayout } from '../gridLayout';

describe('gridLayout', () => {
  it('returns a fallback when box is tiny', () => {
    const layout = computeBestLayout({ width: 10 });
    expect(layout.cell).toBeGreaterThanOrEqual(8);
    expect(layout.cols).toBeGreaterThan(0);
  });

  it('prefers larger cells when enough space', () => {
    const a = computeBestLayout({ width: 360 });
    const b = computeBestLayout({ width: 720 });
    expect(b.cell).toBeGreaterThanOrEqual(a.cell);
  });

  it('uses smaller gap on narrow screens', () => {
    const layout = computeBestLayout({ width: 400 });
    expect(layout.gap).toBe(4);
  });

  it('uses default gap on wide screens', () => {
    const layout = computeBestLayout({ width: 600 });
    expect(layout.gap).toBe(6);
  });
});
