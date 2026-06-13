import { useEffect, useRef, useState } from 'react';
import { computeBestLayout } from '../gridLayout';
import type { GridDensity, GridLayout } from '../gridLayout';

const DEFAULT_LAYOUT: GridLayout = { cols: 20, cell: 14, gap: 6 };

type GridLayoutOptions = {
  /** Widen the grid on roomy (desktop) columns; capped to keep dots tidy. */
  maxWidth?: number;
  /** Ceiling on dot size so a wider cap yields more columns, not bigger dots. */
  maxCell?: number;
};

export function useGridLayout(density: GridDensity, options: GridLayoutOptions = {}) {
  const { maxWidth, maxCell } = options;
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridLayout, setGridLayout] = useState<GridLayout>(DEFAULT_LAYOUT);
  const prevWidthRef = useRef(0);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const initialWidth = Math.round(parent.getBoundingClientRect().width);
    if (initialWidth > 0) {
      prevWidthRef.current = initialWidth;
      setGridLayout(computeBestLayout({ width: initialWidth, density, maxWidth, maxCell }));
    }

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const w = Math.round(cr.width);
      if (w === prevWidthRef.current) return;
      prevWidthRef.current = w;
      setGridLayout(computeBestLayout({ width: w, density, maxWidth, maxCell }));
    });

    ro.observe(parent);
    return () => ro.disconnect();
  }, [density, maxWidth, maxCell]);

  return { gridRef, gridLayout };
}
