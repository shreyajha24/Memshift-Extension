/**
 * Minimal WebExtension API accessor.
 * Chromium exposes `chrome.*`; Firefox prefers `browser.*` (Promise-based).
 * Prefer this over hard-coding `chrome` so shared code stays portable.
 */

type ExtensionGlobal = typeof globalThis & {
  chrome?: typeof chrome;
  browser?: typeof chrome;
};

function resolveApi(): typeof chrome {
  const g = globalThis as ExtensionGlobal;
  // Prefer an API that reports a real extension runtime id when available.
  if (g.chrome?.runtime?.id) return g.chrome;
  if (g.browser?.runtime?.id) return g.browser;
  if (g.chrome?.runtime) return g.chrome;
  if (g.browser?.runtime) return g.browser;
  if (g.chrome) return g.chrome;
  if (g.browser) return g.browser;
  throw new Error('MemShift: browser extension API is unavailable in this context');
}

/** Resolved extension API (`chrome` on Chromium, `browser` on Firefox when present). */
export const ext: typeof chrome = new Proxy({} as typeof chrome, {
  get(_target, prop, receiver) {
    const api = resolveApi() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(api, prop, receiver);
    return typeof value === 'function' ? value.bind(api) : value;
  },
});

export function hasExtensionApi(): boolean {
  try {
    const g = globalThis as ExtensionGlobal;
    return Boolean(g.chrome?.runtime || g.browser?.runtime);
  } catch {
    return false;
  }
}

export type ExtMessageSender = chrome.runtime.MessageSender;
export type ExtStorageChange = chrome.storage.StorageChange;
