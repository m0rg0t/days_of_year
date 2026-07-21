import bridge, { BannerAdLayoutType, BannerAdLocation } from '@vkontakte/vk-bridge';

export type BannerLayoutType = 'resize' | 'overlay';

const LAYOUT_MAP: Record<BannerLayoutType, BannerAdLayoutType> = {
  resize: BannerAdLayoutType.RESIZE,
  overlay: BannerAdLayoutType.OVERLAY,
};

let initPromise: Promise<void> | null = null;

/**
 * Idempotent VKWebAppInit — ad calls made before init completes fail silently
 * on mobile clients, so every ad entry point awaits this first. Never rejects.
 */
export function initVkBridge(): Promise<void> {
  initPromise ??= bridge
    .send('VKWebAppInit')
    .then(() => undefined)
    .catch(() => undefined);
  return initPromise;
}

export async function showBannerAd(opts?: { layoutType?: BannerLayoutType }) {
  try {
    await initVkBridge();
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
