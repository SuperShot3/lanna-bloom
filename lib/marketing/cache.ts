import 'server-only';

import { MARKETING_SAFETY } from './config';

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(
  key: string,
  value: T,
  ttlMs: number = MARKETING_SAFETY.cacheTtlMs,
): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheKey(parts: (string | number | undefined)[]): string {
  return parts.filter((p) => p != null && p !== '').join(':');
}
