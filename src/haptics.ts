import bridge from '@vkontakte/vk-bridge';

export function hapticSelection() {
  try {
    bridge.send('VKWebAppTapticImpactOccurred', { style: 'light' });
  } catch {
    // no-op: haptics unavailable
  }
}

export function hapticSuccess() {
  try {
    bridge.send('VKWebAppTapticNotificationOccurred', { type: 'success' });
  } catch {
    // no-op: haptics unavailable
  }
}
