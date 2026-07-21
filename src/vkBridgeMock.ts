/**
 * Dev-mode mock for VK Bridge calls, so the app is fully usable in a plain
 * browser (no VK client). vkBridge.ts routes here automatically when
 * isDevMode() is true. Add/adjust entries as you adopt more VKWebApp* methods.
 */

export const MOCK_USER = {
  id: 1,
  first_name: 'Dev',
  last_name: 'User',
  photo_200: '',
  city: { id: 1, title: 'Localhost' },
};

/** Canned responses keyed by VK Bridge method name. */
const MOCKS: Record<string, unknown> = {
  VKWebAppGetUserInfo: MOCK_USER,
  VKWebAppGetLaunchParams: {
    vk_user_id: 1,
    vk_app_id: 1,
    vk_is_app_user: 1,
    vk_are_notifications_enabled: 0,
    vk_language: 'ru',
    vk_ref: 'mock',
    vk_access_token_settings: '',
    vk_platform: 'desktop_web',
    vk_is_favorite: 0,
    vk_ts: 1_700_000_000,
    sign: 'mock-signature-not-for-authentication',
  },

  // Ads — return "available" so you can exercise the UI path in dev. Note: no
  // real ad renders in dev; only the VK client shows actual ads.
  VKWebAppCheckNativeAds: { result: true },
  VKWebAppShowNativeAds: { result: true },
  VKWebAppCheckBannerAd: {
    result: true,
    banner_width: 320,
    banner_height: 64,
    banner_location: 'bottom',
    banner_align: 'center',
    layout_type: 'resize',
    height_type: 'regular',
    orientation: 'horizontal',
  },
  VKWebAppShowBannerAd: {
    result: true,
    banner_width: 320,
    banner_height: 64,
    banner_location: 'bottom',
    banner_align: 'center',
    layout_type: 'resize',
    height_type: 'regular',
    orientation: 'horizontal',
  },
  VKWebAppHideBannerAd: {
    result: true,
    banner_width: 320,
    banner_height: 64,
    banner_location: 'bottom',
    banner_align: 'center',
    layout_type: 'resize',
    height_type: 'regular',
    orientation: 'horizontal',
  },

  // App config / haptics
  VKWebAppGetConfig: { scheme: 'bright_light' },
  VKWebAppTapticImpactOccurred: { result: true },
  VKWebAppTapticNotificationOccurred: { result: true },

  // Sharing
  VKWebAppShare: [{ type: 'link' }],
  VKWebAppShowStoryBox: { result: true },
  VKWebAppDownloadFile: { result: true },

  // Storage (in-memory below overrides these for round-tripping)
  VKWebAppStorageSet: { result: true },
  VKWebAppStorageGet: { keys: [] },
  VKWebAppStorageGetKeys: { keys: [] },
};

// Tiny in-memory store so StorageSet/Get actually round-trip in dev.
const memStore = new Map<string, string>();

export function getMockResponse<T>(method: string, params: Record<string, unknown> = {}): T {
  if (method === 'VKWebAppStorageSet') {
    memStore.set(String(params.key), String(params.value));
    return { result: true } as T;
  }
  if (method === 'VKWebAppStorageGet') {
    const keys = (params.keys as string[]) ?? [];
    return { keys: keys.map((key) => ({ key, value: memStore.get(key) ?? '' })) } as T;
  }
  if (method === 'VKWebAppStorageGetKeys') {
    return { keys: [...memStore.keys()] } as T;
  }
  if (!(method in MOCKS)) throw new Error(`Unsupported VK Bridge mock method: ${method}`);
  return MOCKS[method] as T;
}
