import bridge, { BannerAdLayoutType, BannerAdLocation } from '@vkontakte/vk-bridge';

export type BannerLayoutType = 'resize' | 'overlay';

const LAYOUT_MAP: Record<BannerLayoutType, BannerAdLayoutType> = {
  resize: BannerAdLayoutType.RESIZE,
  overlay: BannerAdLayoutType.OVERLAY,
};

export async function showBannerAd(opts?: { layoutType?: BannerLayoutType }) {
  try {
    return await bridge.send('VKWebAppShowBannerAd', {
      banner_location: BannerAdLocation.BOTTOM,
      layout_type: LAYOUT_MAP[opts?.layoutType ?? 'resize'],
    });
  } catch {
    return { result: false as const };
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
