import '@testing-library/jest-dom/vitest';

// Force the vkBridge service down the real-bridge path in tests: suites mock
// '@vkontakte/vk-bridge' directly, so isDevMode() must be false (the service
// treats a present window.vkBridge as "inside VK").
(window as Window & { vkBridge?: unknown }).vkBridge = {};

// jsdom doesn't provide ResizeObserver by default
class ResizeObserverMock {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe(target: Element) {
    // trigger once with a reasonable size so layout code executes
    const rect = target.getBoundingClientRect?.() ?? { width: 360, height: 640 };
    this.cb(
      [{ contentRect: rect } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// VKUI relies on matchMedia
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => {
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  }) as typeof window.matchMedia;
}
