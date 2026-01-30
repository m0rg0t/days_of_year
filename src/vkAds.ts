import bridge from '@vkontakte/vk-bridge';

export type BannerLayoutType = 'resize' | 'overlay';

export async function showBannerAd(opts?: { layoutType?: BannerLayoutType }) {
  try {
    const res = await bridge.send('VKWebAppShowBannerAd', {
      banner_location: 'bottom',
      layout_type: opts?.layoutType ?? 'resize',
    } as any);
    return res as {
      result: boolean;
      banner_width?: number;
      banner_height?: number;
      banner_location?: string;
      layout_type?: string;
    };
  } catch {
    return { result: false };
  }
}

export async function hideBannerAd() {
  try {
    await bridge.send('VKWebAppHideBannerAd');
    return true;
  } catch {
    return false;
  }
}
