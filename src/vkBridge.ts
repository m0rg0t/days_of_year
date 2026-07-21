/**
 * Centralized VK Bridge service — the single entry point for every bridge call.
 *
 * Why centralize: panels/hooks should never branch on environment. They call
 * vkBridgeService.* and this module decides — in dev it routes to the mock layer
 * so the app runs in a plain browser; in the VK client it calls the real bridge
 * with consistent timeout + error handling.
 *
 * Drop-in: place alongside logger.ts and vkBridgeMock.ts (same folder), or fix
 * the two relative imports below to wherever you put them.
 */

import vkBridge from '@vkontakte/vk-bridge';
import type { AnyReceiveMethodName, VKBridgeEvent } from '@vkontakte/vk-bridge';
import { logger } from './logger';
import { getMockResponse, MOCK_USER } from './vkBridgeMock';

// ── Environment detection ───────────────────────────────────────────────────

export const isVKEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isInIframe = window.parent !== window;
  const isVKApp =
    navigator.userAgent.includes('VKAndroidApp') || navigator.userAgent.includes('VKiOSApp');
  const hasVKBridge = !!(window as Window & { vkBridge?: unknown }).vkBridge;
  return isInIframe || isVKApp || hasVKBridge;
};

/** True only in a dev build running OUTSIDE VK — i.e. when calls should be mocked. */
export const isDevMode = (): boolean => import.meta.env.DEV && !isVKEnvironment();

// ── Core call ───────────────────────────────────────────────────────────────

export interface VkBridgeOptions {
  timeout?: number | null;
  mockDelay?: number;
}

/** Send a bridge command with consistent error handling; mocks automatically in dev. */
export async function vkBridgeSend<T>(
  method: string,
  params: Record<string, unknown> = {},
  options: VkBridgeOptions = {}
): Promise<T | null> {
  const { timeout = 5000, mockDelay = 150 } = options;

  if (isDevMode()) {
    await new Promise((resolve) => setTimeout(resolve, mockDelay));
    return getMockResponse<T>(method, params);
  }

  try {
    const shouldTimeout = typeof timeout === 'number' && timeout > 0;
    if (shouldTimeout) {
      return await Promise.race([
        vkBridge.send(method as never, params as never) as Promise<T>,
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error(`VK Bridge timeout: ${method}`)), timeout)
        ),
      ]);
    }
    return await (vkBridge.send(method as never, params as never) as Promise<T>);
  } catch (error) {
    logger.error(`[VK Bridge] Error in ${method}:`, error);
    return null;
  }
}

// ── Response shapes ─────────────────────────────────────────────────────────

export interface StorageGetResponse {
  keys: Array<{ key: string; value: string }>;
}
export interface StorageGetKeysResponse {
  keys: string[];
}
export interface ShowBannerAdParams {
  banner_location: 'top' | 'bottom';
  banner_align?: 'left' | 'center' | 'right';
  layout_type?: 'resize' | 'overlay';
  height_type?: 'compact' | 'regular';
  orientation?: 'horizontal' | 'vertical';
}
export interface BannerAdResponse {
  result: boolean;
  banner_width: number;
  banner_height: number;
  banner_location: 'top' | 'bottom';
  banner_align?: 'left' | 'center' | 'right';
  layout_type: 'resize' | 'overlay';
  height_type: 'compact' | 'regular';
  orientation?: 'horizontal' | 'vertical';
}

// ── High-level API ──────────────────────────────────────────────────────────

export const vkBridgeService = {
  // User / launch
  getUserInfo: () => vkBridgeSend<typeof MOCK_USER>('VKWebAppGetUserInfo'),
  getLaunchParams: () => vkBridgeSend<Record<string, unknown>>('VKWebAppGetLaunchParams'),

  // Native ads (interstitial / reward) — long timeout, the user watches an ad.
  checkAds: (adFormat: 'reward' | 'interstitial') =>
    vkBridgeSend<{ result: boolean }>('VKWebAppCheckNativeAds', { ad_format: adFormat }),
  showAd: (adFormat: 'reward' | 'interstitial') =>
    vkBridgeSend<{ result: boolean }>('VKWebAppShowNativeAds', { ad_format: adFormat }, { timeout: 60000 }),

  // Banner ads (persistent host overlay — separate from native ads).
  checkBannerAd: () => vkBridgeSend<BannerAdResponse>('VKWebAppCheckBannerAd'),
  showBannerAd: (params: ShowBannerAdParams) =>
    vkBridgeSend<BannerAdResponse>('VKWebAppShowBannerAd', { ...params }, { timeout: 30000 }),
  hideBannerAd: () => vkBridgeSend<BannerAdResponse>('VKWebAppHideBannerAd'),

  // App config (theme scheme etc.)
  getConfig: () => vkBridgeSend<{ scheme?: string }>('VKWebAppGetConfig'),

  // Haptics — fire-and-forget; unavailable outside mobile VK clients.
  tapticImpact: (style: 'light' | 'medium' | 'heavy' = 'light') =>
    vkBridgeSend<{ result: boolean }>('VKWebAppTapticImpactOccurred', { style }),
  tapticNotification: (type: 'success' | 'warning' | 'error' = 'success') =>
    vkBridgeSend<{ result: boolean }>('VKWebAppTapticNotificationOccurred', { type }),

  // Sharing
  share: (link?: string) =>
    vkBridgeSend<Array<{ type: string }>>('VKWebAppShare', link ? { link } : {}),
  showStoryBox: (params: Record<string, unknown>) =>
    vkBridgeSend<{ result: boolean }>('VKWebAppShowStoryBox', params, { timeout: 60000 }),
  downloadFile: (url: string, filename: string) =>
    vkBridgeSend<{ result: boolean }>('VKWebAppDownloadFile', { url, filename }, { timeout: 30000 }),

  // Cloud storage (per-user key/value)
  storageSet: (key: string, value: string) =>
    vkBridgeSend<{ result: boolean }>('VKWebAppStorageSet', { key, value }, { timeout: 10000 }),
  storageGet: (keys: string[]) =>
    vkBridgeSend<StorageGetResponse>('VKWebAppStorageGet', { keys }, { timeout: 10000 }),
  storageGetKeys: (count = 100, offset = 0) =>
    vkBridgeSend<StorageGetKeysResponse>('VKWebAppStorageGetKeys', { count, offset }, { timeout: 10000 }),
};

// ── Events ──────────────────────────────────────────────────────────────────

export function vkBridgeSubscribe(
  callback: (event: VKBridgeEvent<AnyReceiveMethodName>) => void
): () => void {
  if (isDevMode()) return () => {};
  vkBridge.subscribe(callback);
  return () => vkBridge.unsubscribe(callback);
}

// ── Init ────────────────────────────────────────────────────────────────────

let initPromise: Promise<void> | null = null;

/**
 * Idempotent: the first call sends VKWebAppInit; later callers await the same
 * promise. Ad (and other) calls made before init completes can fail silently on
 * mobile clients — always `await initVkBridge()` in mount-time hooks instead of
 * racing the fire-and-forget init from main.tsx.
 */
export function initVkBridge(): Promise<void> {
  initPromise ??= (async () => {
    if (isDevMode()) {
      logger.log('[VK Bridge] Init (dev mode)');
      return;
    }
    try {
      await vkBridge.send('VKWebAppInit');
      logger.log('[VK Bridge] Initialized');
    } catch (error) {
      logger.error('[VK Bridge] Init error:', error);
    }
  })();
  return initPromise;
}
