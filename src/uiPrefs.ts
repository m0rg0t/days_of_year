import type { GridDensity } from './gridLayout';

const GRID_DENSITY_KEY = 'days_of_year:grid_density';

export function loadGridDensity(): GridDensity {
  try {
    const raw = localStorage.getItem(GRID_DENSITY_KEY);
    if (raw === 'compact' || raw === 'comfortable') return raw;
    // Comfortable by default everywhere — bigger, clearer dots read better,
    // especially on mobile. Users can still switch to compact.
    return 'comfortable';
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
