import { useEffect, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import type { ColorSchemeType } from '@vkontakte/vkui';
import { hideBannerAd, showBannerAd } from '../vkAds';

function toColorScheme(scheme: string): ColorSchemeType {
  if (scheme === 'space_gray' || scheme === 'vkcom_dark') return 'dark';
  if (scheme === 'bright_light' || scheme === 'vkcom_light') return 'light';
  return 'dark';
}

export function useVkTheme() {
  const [colorScheme, setColorScheme] = useState<ColorSchemeType>('dark');

  useEffect(() => {
    bridge.send('VKWebAppInit').catch(() => {});
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
    const isDark = colorScheme === 'dark';
    document.body.style.background = isDark ? '#0a0a0a' : '#ebedf0';
    document.body.style.color = isDark ? '#f5f5f7' : '#1a1a1e';
  }, [colorScheme]);

  return colorScheme;
}
