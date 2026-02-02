import { useEffect, useRef, useState } from 'react';
import { computeBestLayout } from '../gridLayout';
import type { GridDensity, GridLayout } from '../gridLayout';

const DEFAULT_LAYOUT: GridLayout = { cols: 20, cell: 14, gap: 6 };

export function useGridLayout(density: GridDensity) {
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
      setGridLayout(computeBestLayout({ width: initialWidth, density }));
    }

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const w = Math.round(cr.width);
      if (w === prevWidthRef.current) return;
      prevWidthRef.current = w;
      setGridLayout(computeBestLayout({ width: w, density }));
    });

    ro.observe(parent);
    return () => ro.disconnect();
  }, [density]);

  return { gridRef, gridLayout };
}
