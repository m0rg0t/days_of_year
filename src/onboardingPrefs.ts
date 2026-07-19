export const ONBOARDING_SEEN_KEY = 'days_of_year:onboarding:v1';

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
  } catch {
    // The app remains usable when storage is unavailable; onboarding can be
    // shown again on the next launch.
  }
}
