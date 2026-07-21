import { useEffect, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import type { ColorSchemeType } from '@vkontakte/vkui';
import { hideBannerAd, initVkBridge, showBannerAd } from '../vkAds';

function toColorScheme(scheme: string): ColorSchemeType {
  if (scheme === 'space_gray' || scheme === 'vkcom_dark') return 'dark';
  if (scheme === 'bright_light' || scheme === 'vkcom_light') return 'light';
  return 'dark';
}

export function useVkTheme() {
  const [colorScheme, setColorScheme] = useState<ColorSchemeType>('dark');

  useEffect(() => {
    initVkBridge();
    bridge
      .send('VKWebAppGetConfig')
      .then((cfg) => {
        if ('scheme' in cfg && typeof cfg.scheme === 'string') {
          setColorScheme(toColorScheme(cfg.scheme));
        }
      })
      .catch(() => {});

    const listener: import('@vkontakte/vk-bridge').VKBridgeSubscribeHandler = (e) => {
      if (e.detail.type === 'VKWebAppUpdateConfig') {
        const data = e.detail.data;
        if ('scheme' in data && typeof data.scheme === 'string') {
          setColorScheme(toColorScheme(data.scheme));
        }
      }
    };

    bridge.subscribe(listener);
    showBannerAd({ layoutType: 'resize' }).catch(() => {});

    return () => {
      bridge.unsubscribe(listener);
      hideBannerAd().catch(() => {});
    };
  }, []);

  useEffect(() => {
    // Mirror the active scheme onto <body> so the area around AppRoot
    // (overscroll, safe-area insets) matches the app. VKUI color tokens are
    // scoped to AppRoot, so they can't drive <body> directly; restore the
    // previous inline style on cleanup instead of leaking it past unmount.
    const isDark = colorScheme === 'dark';
    const prevBackground = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = isDark ? '#0a0a0a' : '#ebedf0';
    document.body.style.color = isDark ? '#f5f5f7' : '#1a1a1e';

    return () => {
      document.body.style.background = prevBackground;
      document.body.style.color = prevColor;
    };
  }, [colorScheme]);

  return colorScheme;
}
