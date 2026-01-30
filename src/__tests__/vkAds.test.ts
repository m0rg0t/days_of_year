import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vkontakte/vk-bridge', () => {
  return {
    default: {
      send: vi.fn(),
    },
  };
});

import bridge from '@vkontakte/vk-bridge';
import { hideBannerAd, showBannerAd } from '../vkAds';

describe('vkAds', () => {
  beforeEach(() => {
    (bridge.send as any).mockReset();
  });

  it('showBannerAd calls VKWebAppShowBannerAd', async () => {
    (bridge.send as any).mockResolvedValue({ result: true, banner_height: 50 });
    const res = await showBannerAd({ layoutType: 'resize' });
    expect(res.result).toBe(true);
    expect((bridge.send as any).mock.calls[0][0]).toBe('VKWebAppShowBannerAd');
  });

  it('showBannerAd defaults to resize when no opts', async () => {
    (bridge.send as any).mockResolvedValue({ result: true });
    await showBannerAd();
    expect((bridge.send as any).mock.calls[0][1].layout_type).toBe('resize');
  });

  it('showBannerAd returns result:false on failure', async () => {
    (bridge.send as any).mockRejectedValue(new Error('no'));
    const res = await showBannerAd({ layoutType: 'resize' });
    expect(res.result).toBe(false);
  });

  it('hideBannerAd calls VKWebAppHideBannerAd', async () => {
    (bridge.send as any).mockResolvedValue({ result: true });
    const ok = await hideBannerAd();
    expect(ok).toBe(true);
    expect((bridge.send as any).mock.calls[0][0]).toBe('VKWebAppHideBannerAd');
  });

  it('hideBannerAd returns false on failure', async () => {
    (bridge.send as any).mockRejectedValue(new Error('no'));
    const ok = await hideBannerAd();
    expect(ok).toBe(false);
  });
});
