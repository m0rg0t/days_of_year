export type GridLayout = { cols: number; cell: number; gap: number };

/**
 * Compute a grid layout that fits totalDays into the available box.
 * Returns best layout by maximizing cell size.
 */
export function computeBestLayout(params: {
  totalDays: number;
  width: number;
  height: number;
}): GridLayout {
  const { totalDays, width, height } = params;

  const pad = 4;
  const W = Math.max(0, width - pad * 2);
  const H = Math.max(0, height - pad * 2);

  const candidates: GridLayout[] = [];

  for (let cols = 14; cols <= 26; cols++) {
    const rows = Math.ceil(totalDays / cols);
    const gap = W < 420 ? 4 : 6;

    const cellW = (W - gap * (cols - 1)) / cols;
    const cellH = (H - gap * (rows - 1)) / rows;
    const cell = Math.floor(Math.min(cellW, cellH));

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
