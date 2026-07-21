import { initVkBridge, vkBridgeService } from './vkBridge';

export type BannerLayoutType = 'resize' | 'overlay';

export { initVkBridge };

export async function showBannerAd(opts?: { layoutType?: BannerLayoutType }) {
  // Ad calls made before VKWebAppInit completes fail silently on mobile
  // clients — await the (memoized) init first.
  await initVkBridge();
  const res = await vkBridgeService.showBannerAd({
    banner_location: 'bottom',
    layout_type: opts?.layoutType ?? 'resize',
  });
  return res ?? { result: false as const };
}

export async function hideBannerAd() {
  const res = await vkBridgeService.hideBannerAd();
  return res?.result ?? false;
}
