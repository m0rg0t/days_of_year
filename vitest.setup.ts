import '@testing-library/jest-dom/vitest';

// jsdom doesn't provide ResizeObserver by default
class ResizeObserverMock {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe(target: Element) {
    // trigger once with a reasonable size so layout code executes
    const rect = (target as any).getBoundingClientRect?.() || { width: 360, height: 640 };
    this.cb([{ contentRect: rect } as any], this as any);
  }
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error - test global
globalThis.ResizeObserver = ResizeObserverMock;

// VKUI relies on matchMedia
if (!window.matchMedia) {
  // @ts-expect-error - polyfill
  window.matchMedia = (query: string) => {
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
  };
}
