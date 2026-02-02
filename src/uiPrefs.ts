import type { GridDensity } from './gridLayout';

const GRID_DENSITY_KEY = 'days_of_year:grid_density';

export function loadGridDensity(): GridDensity {
  try {
    const raw = localStorage.getItem(GRID_DENSITY_KEY);
    if (raw === 'compact' || raw === 'comfortable') return raw;
    return window.innerWidth <= 420 ? 'compact' : 'comfortable';
  } catch {
    return 'comfortable';
  }
}

export function saveGridDensity(density: GridDensity) {
  try {
    localStorage.setItem(GRID_DENSITY_KEY, density);
  } catch {
    // ignore
  }
}
