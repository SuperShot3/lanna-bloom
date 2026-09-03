/** Max wait before running deferred main-thread work (GTM, chrome, carousels). */
export const IDLE_TIMEOUT_MS = 2500;

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Run `callback` on idle, or after `timeoutMs` if the main thread stays busy.
 * Returns a cancel function.
 */
export function scheduleIdle(
  callback: () => void,
  timeoutMs: number = IDLE_TIMEOUT_MS
): () => void {
  if (typeof window === 'undefined') return () => {};

  const w = window as IdleWindow;
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(() => callback(), { timeout: timeoutMs });
    return () => w.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(callback, timeoutMs);
  return () => window.clearTimeout(id);
}
