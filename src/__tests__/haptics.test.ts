import { beforeEach, describe, expect, it, vi } from 'vitest';
import bridge from '@vkontakte/vk-bridge';
import { hapticSelection, hapticSuccess } from '../haptics';

vi.mock('@vkontakte/vk-bridge', () => ({
  default: { send: vi.fn() },
}));

describe('haptics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hapticSelection sends a light impact', () => {
    vi.mocked(bridge.send).mockResolvedValue({} as never);
    expect(() => hapticSelection()).not.toThrow();
    expect(bridge.send).toHaveBeenCalledWith('VKWebAppTapticImpactOccurred', { style: 'light' });
  });

  it('hapticSelection swallows bridge failures (no unhandled rejection)', async () => {
    // Rejection handling now lives inside vkBridgeSend (try/await/catch).
    // Flush microtasks so an unhandled rejection — which vitest reports as a
    // failure — would surface if that handling were removed.
    vi.mocked(bridge.send).mockRejectedValue(new Error('no vk'));
    expect(() => hapticSelection()).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });

  it('hapticSuccess sends a success notification', () => {
    vi.mocked(bridge.send).mockResolvedValue({} as never);
    expect(() => hapticSuccess()).not.toThrow();
    expect(bridge.send).toHaveBeenCalledWith('VKWebAppTapticNotificationOccurred', { type: 'success' });
  });

  it('hapticSuccess swallows bridge failures (no unhandled rejection)', async () => {
    vi.mocked(bridge.send).mockRejectedValue(new Error('no vk'));
    expect(() => hapticSuccess()).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });
});
