import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vkontakte/vk-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vkontakte/vk-bridge')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      send: vi.fn(),
    },
  };
});

import bridge from '@vkontakte/vk-bridge';
import { hideBannerAd, showBannerAd } from '../vkAds';

const mockSend = vi.mocked(bridge.send);

describe('vkAds', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('showBannerAd calls VKWebAppShowBannerAd', async () => {
    mockSend.mockResolvedValue({ result: true, banner_height: 50 } as Awaited<ReturnType<typeof bridge.send>>);
    const res = await showBannerAd({ layoutType: 'resize' });
    expect(res.result).toBe(true);
    expect(mockSend.mock.calls[0][0]).toBe('VKWebAppShowBannerAd');
  });

  it('showBannerAd defaults to resize when no opts', async () => {
    mockSend.mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);
    await showBannerAd();
    expect((mockSend.mock.calls[0][1] as { layout_type: string }).layout_type).toBe('resize');
  });

  it('showBannerAd returns result:false on failure', async () => {
    mockSend.mockRejectedValue(new Error('no'));
    const res = await showBannerAd({ layoutType: 'resize' });
    expect(res.result).toBe(false);
  });

  it('hideBannerAd calls VKWebAppHideBannerAd', async () => {
    mockSend.mockResolvedValue({ result: true } as Awaited<ReturnType<typeof bridge.send>>);
    const ok = await hideBannerAd();
    expect(ok).toBe(true);
    expect(mockSend.mock.calls[0][0]).toBe('VKWebAppHideBannerAd');
  });

  it('hideBannerAd returns false on failure', async () => {
    mockSend.mockRejectedValue(new Error('no'));
    const ok = await hideBannerAd();
    expect(ok).toBe(false);
  });
});
