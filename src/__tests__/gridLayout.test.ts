import { describe, expect, it } from 'vitest';
import { computeBestLayout, gridCSSVars } from '../gridLayout';

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

  it('compact density produces smaller or equal cells', () => {
    const comfortable = computeBestLayout({ width: 480, density: 'comfortable' });
    const compact = computeBestLayout({ width: 480, density: 'compact' });
    expect(compact.cell).toBeLessThanOrEqual(comfortable.cell);
  });

  it('maxCell caps dot size so a wider maxWidth yields more columns, not bigger dots', () => {
    const capped = computeBestLayout({ width: 900, maxWidth: 620, maxCell: 18 });
    const uncapped = computeBestLayout({ width: 900 }); // default maxWidth 420, no maxCell

    expect(capped.cell).toBeLessThanOrEqual(18);
    // The wider-but-capped layout packs more, smaller columns than the narrow default.
    expect(capped.cols).toBeGreaterThan(uncapped.cols);
  });

  it('maxWidth widens the usable area vs the default cap', () => {
    const wide = computeBestLayout({ width: 900, maxWidth: 620 });
    const narrow = computeBestLayout({ width: 900 }); // capped at 420
    expect(wide.cell).toBeGreaterThanOrEqual(narrow.cell);
  });
});

describe('gridCSSVars', () => {
  it('maps a layout to the grid CSS custom properties', () => {
    expect(gridCSSVars({ cols: 20, cell: 14, gap: 6 })).toEqual({
      '--cols': 20,
      '--cell': '14px',
      '--gap': '6px',
    });
  });
});
