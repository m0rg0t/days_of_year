import type { CSSProperties } from 'react';

export type GridLayout = { cols: number; cell: number; gap: number };
export type GridDensity = 'comfortable' | 'compact';

/** CSS custom properties consumed by `.day-grid__grid` / `.export-card__grid`. */
export type GridCSSVars = CSSProperties & {
  '--cols': number;
  '--cell': string;
  '--gap': string;
};

/** Build the typed CSS custom properties for a grid layout (no `as` cast needed). */
export function gridCSSVars(layout: GridLayout): GridCSSVars {
  return {
    '--cols': layout.cols,
    '--cell': `${layout.cell}px`,
    '--gap': `${layout.gap}px`,
  };
}

/**
 * Compute a grid layout that fits totalDays into the available width.
 * Only width is used to avoid ResizeObserver feedback loops where
 * height-constrained cell sizes change the grid height, which in turn
 * changes the container height and triggers another resize.
 *
 * `maxWidth` caps how wide the grid may grow (keeps rows from becoming too
 * tall / dots too large on wide desktop columns). `maxCell` caps the dot size
 * so a wider cap produces MORE columns (a denser, fuller block) rather than a
 * handful of oversized dots.
 */
export function computeBestLayout(params: {
  width: number;
  density?: GridDensity;
  maxWidth?: number;
  maxCell?: number;
}): GridLayout {
  const { width, density = 'comfortable', maxWidth = 420, maxCell = Infinity } = params;

  // Cap calculation width to keep grid rows from becoming too tall on wide screens.
  const effectiveWidth = Math.min(width, maxWidth);
  const pad = 4;
  const W = Math.max(0, effectiveWidth - pad * 2);

  const candidates: GridLayout[] = [];

  const colRange = density === 'compact'
    ? { min: 20, max: 36 }
    : { min: 16, max: 34 };

  for (let cols = colRange.min; cols <= colRange.max; cols++) {
    const baseGap = effectiveWidth < 420 ? 4 : 6;
    const gap = density === 'compact' ? Math.max(2, baseGap - 2) : baseGap;
    const cell = Math.floor((W - gap * (cols - 1)) / cols);

    if (cell >= 8 && cell <= maxCell) {
      candidates.push({ cols, cell, gap });
    }
  }

  // Fallback: if constraints are too tight, return a tiny but valid layout.
  if (!candidates.length) {
    return { cols: 20, cell: 8, gap: 4 };
  }

  candidates.sort((a, b) => b.cell - a.cell);
  return candidates[0];
}
