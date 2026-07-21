import { vkBridgeService } from './vkBridge';

// The service never rejects (errors resolve to null), so fire-and-forget is
// safe — no unhandled rejections in non-VK environments.

export function hapticSelection() {
  void vkBridgeService.tapticImpact('light');
}

export function hapticSuccess() {
  void vkBridgeService.tapticNotification('success');
}
