export type GridLayout = { cols: number; cell: number; gap: number };
export type GridDensity = 'comfortable' | 'compact';

/**
 * Compute a grid layout that fits totalDays into the available width.
 * Only width is used to avoid ResizeObserver feedback loops where
 * height-constrained cell sizes change the grid height, which in turn
 * changes the container height and triggers another resize.
 */
export function computeBestLayout(params: {
  width: number;
  density?: GridDensity;
}): GridLayout {
  const { width, density = 'comfortable' } = params;

  // Cap calculation width to keep grid rows from becoming too tall on wide screens.
  const effectiveWidth = Math.min(width, 420);
  const pad = 4;
  const W = Math.max(0, effectiveWidth - pad * 2);

  const candidates: GridLayout[] = [];

  const colRange = density === 'compact'
    ? { min: 20, max: 34 }
    : { min: 16, max: 30 };

  for (let cols = colRange.min; cols <= colRange.max; cols++) {
    const baseGap = width < 420 ? 4 : 6;
    const gap = density === 'compact' ? Math.max(2, baseGap - 2) : baseGap;
    const cell = Math.floor((W - gap * (cols - 1)) / cols);

    if (cell >= 8) {
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
