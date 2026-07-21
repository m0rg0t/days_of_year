/**
 * Environment-aware logger for a VK Mini App.
 *
 * log/info/warn are silenced in production builds so the console stays clean for
 * real users; error always emits. `diag` ALSO always emits — use it for the
 * handful of traces you must be able to read inside the VK client itself (e.g.
 * "did the banner ad actually show?"), which you can't reproduce in dev because
 * dev mocks the bridge.
 *
 * Pair with ESLint `no-console: error` everywhere EXCEPT this file (add a single
 * override turning it `off` for this path), so all logging funnels through here.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]): void => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
  /** Always emits, even in production — for diagnostics that must be visible in
   *  the VK client. Keep these few and intentional. */
  diag: (...args: unknown[]): void => {
    console.info(...args);
  },
};
