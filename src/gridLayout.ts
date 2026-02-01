export type GridLayout = { cols: number; cell: number; gap: number };

/**
 * Compute a grid layout that fits totalDays into the available width.
 * Only width is used to avoid ResizeObserver feedback loops where
 * height-constrained cell sizes change the grid height, which in turn
 * changes the container height and triggers another resize.
 */
export function computeBestLayout(params: {
  width: number;
}): GridLayout {
  const { width } = params;

  const pad = 4;
  const W = Math.max(0, width - pad * 2);

  const candidates: GridLayout[] = [];

  for (let cols = 14; cols <= 26; cols++) {
    const gap = W < 420 ? 4 : 6;
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
