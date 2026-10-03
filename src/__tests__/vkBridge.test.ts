import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const bridge = vi.hoisted(() => ({ send: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() }));
vi.mock('@vkontakte/vk-bridge', () => ({ default: bridge }));

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); bridge.send.mockReset(); bridge.send.mockResolvedValue({ result: true }); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it('clears native timeout handles on success and structured denial', async () => {
  const { vkBridgeSend } = await import('../vkBridge');
  expect(await vkBridgeSend('VKWebAppInit')).toEqual({ result: true });
  expect(vi.getTimerCount()).toBe(0);
  bridge.send.mockRejectedValueOnce({ error_type: 'VKWebAppInitFailed' });
  expect(await vkBridgeSend('VKWebAppInit')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

it('native initialization is shared and cannot hang the UI forever', async () => {
  bridge.send.mockImplementation(() => new Promise(() => {}));
  const { initVkBridge } = await import('../vkBridge');
  const first = initVkBridge();
  expect(initVkBridge()).toBe(first);
  await vi.advanceTimersByTimeAsync(5000);
  await expect(first).resolves.toBeUndefined();
  expect(bridge.send).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it('native host subscriptions receive events and unsubscribe', async () => {
  const { vkBridgeSubscribe } = await import('../vkBridge');
  const listener = vi.fn();
  const cleanup = vkBridgeSubscribe(listener);
  bridge.subscribe.mock.calls.at(-1)![0]({ detail: { type: 'VKWebAppUpdateConfig', data: { appearance: 'dark' } } });
  expect(listener).toHaveBeenCalledWith({ detail: { type: 'VKWebAppUpdateConfig', data: { appearance: 'dark' } } });
  cleanup();
  expect(bridge.unsubscribe).toHaveBeenCalledWith(listener);
});

it('forwards user, ad, sharing and storage capability parameters', async () => {
  const { vkBridgeService: service } = await import('../vkBridge');
  await service.getUserInfo(); await service.getLaunchParams();
  await service.checkAds('reward'); await service.showAd('interstitial');
  await service.checkBannerAd(); await service.storageGetKeys(20, 3);
  await service.share(); await service.share('https://example.test');
  expect(bridge.send).toHaveBeenCalledWith('VKWebAppCheckNativeAds', { ad_format: 'reward' });
  expect(bridge.send).toHaveBeenCalledWith('VKWebAppShowNativeAds', { ad_format: 'interstitial' });
  expect(bridge.send).toHaveBeenCalledWith('VKWebAppShare', {});
  expect(bridge.send).toHaveBeenCalledWith('VKWebAppShare', { link: 'https://example.test' });
  expect(bridge.send).toHaveBeenCalledWith('VKWebAppStorageGetKeys', { count: 20, offset: 3 });
});

it('development storage round-trips and unknown mock methods fail open', async () => {
  const host = (window as Window & { vkBridge?: unknown }).vkBridge;
  delete (window as Window & { vkBridge?: unknown }).vkBridge;
  try {
    const { vkBridgeSend, initVkBridge, vkBridgeSubscribe } = await import('../vkBridge');
    await initVkBridge();
    const write = vkBridgeSend('VKWebAppStorageSet', { key: 'test_key', value: 'synthetic' });
    await vi.advanceTimersByTimeAsync(150); await write;
    const read = vkBridgeSend('VKWebAppStorageGet', { keys: ['test_key'] });
    await vi.advanceTimersByTimeAsync(150);
    expect(await read).toEqual({ keys: [{ key: 'test_key', value: 'synthetic' }] });
    const keys = vkBridgeSend('VKWebAppStorageGetKeys');
    await vi.advanceTimersByTimeAsync(150); expect(await keys).toEqual({ keys: ['test_key'] });
    const user = vkBridgeSend('VKWebAppGetUserInfo');
    await vi.advanceTimersByTimeAsync(150); expect(await user).toMatchObject({ first_name: 'Dev' });
    const unknown = vkBridgeSend('UnknownSyntheticMethod');
    await vi.advanceTimersByTimeAsync(150); expect(await unknown).toBeNull();
    expect(() => vkBridgeSubscribe(vi.fn())()).not.toThrow();
  } finally { (window as Window & { vkBridge?: unknown }).vkBridge = host; }
});
