import bridge from '@vkontakte/vk-bridge';

// `bridge.send` returns a Promise, so a synchronous try/catch never sees a
// rejection (it would surface as an unhandled rejection on every tap in non-VK
// environments). Swallow it on the promise instead.

export function hapticSelection() {
  bridge.send('VKWebAppTapticImpactOccurred', { style: 'light' }).catch(() => {
    // no-op: haptics unavailable
  });
}

export function hapticSuccess() {
  bridge.send('VKWebAppTapticNotificationOccurred', { type: 'success' }).catch(() => {
    // no-op: haptics unavailable
  });
}
