import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('vkPlatform', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns desktop_web when vk_platform=desktop_web', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?vk_platform=desktop_web' },
      configurable: true,
    });
    const { getVkPlatform, isDesktopWeb } = await import('../vkPlatform');
    expect(getVkPlatform()).toBe('desktop_web');
    expect(isDesktopWeb()).toBe(true);
  });

  it('returns mobile_android for mobile platform', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?vk_platform=mobile_android' },
      configurable: true,
    });
    const { getVkPlatform, isDesktopWeb } = await import('../vkPlatform');
    expect(getVkPlatform()).toBe('mobile_android');
    expect(isDesktopWeb()).toBe(false);
  });

  it('returns undefined when no vk_platform param', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      configurable: true,
    });
    const { getVkPlatform, isDesktopWeb } = await import('../vkPlatform');
    expect(getVkPlatform()).toBeUndefined();
    expect(isDesktopWeb()).toBe(false);
  });

  it('returns mobile_iphone for iPhone platform', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?vk_platform=mobile_iphone&vk_user_id=123' },
      configurable: true,
    });
    const { getVkPlatform, isDesktopWeb } = await import('../vkPlatform');
    expect(getVkPlatform()).toBe('mobile_iphone');
    expect(isDesktopWeb()).toBe(false);
  });
});
