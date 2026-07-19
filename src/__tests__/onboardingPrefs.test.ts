import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  hasSeenOnboarding,
  markOnboardingSeen,
  ONBOARDING_SEEN_KEY,
} from '../onboardingPrefs';

describe('onboardingPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores and reads onboarding completion', () => {
    expect(hasSeenOnboarding()).toBe(false);

    markOnboardingSeen();

    expect(localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1');
    expect(hasSeenOnboarding()).toBe(true);
  });

  it('falls back safely when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(hasSeenOnboarding()).toBe(false);
    expect(() => markOnboardingSeen()).not.toThrow();
  });
});
