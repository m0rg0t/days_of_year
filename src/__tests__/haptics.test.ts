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

  it('hapticSelection attaches a rejection handler (no unhandled rejection)', async () => {
    // Assert the handler is actually attached to the returned promise — this
    // FAILS if the production .catch() is removed (a synchronous not.toThrow()
    // assertion would not, since async rejections never throw synchronously).
    const rejected = Promise.reject(new Error('no vk'));
    const catchSpy = vi.spyOn(rejected, 'catch');
    vi.mocked(bridge.send).mockReturnValue(rejected as never);

    hapticSelection();

    expect(catchSpy).toHaveBeenCalled();
    await rejected.catch(() => {}); // settle to avoid leaking an unhandled rejection
  });

  it('hapticSuccess sends a success notification', () => {
    vi.mocked(bridge.send).mockResolvedValue({} as never);
    expect(() => hapticSuccess()).not.toThrow();
    expect(bridge.send).toHaveBeenCalledWith('VKWebAppTapticNotificationOccurred', { type: 'success' });
  });

  it('hapticSuccess attaches a rejection handler (no unhandled rejection)', async () => {
    const rejected = Promise.reject(new Error('no vk'));
    const catchSpy = vi.spyOn(rejected, 'catch');
    vi.mocked(bridge.send).mockReturnValue(rejected as never);

    hapticSuccess();

    expect(catchSpy).toHaveBeenCalled();
    await rejected.catch(() => {});
  });
});
