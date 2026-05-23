/**
 * Helpers for caching Sanity catalog reads — dedupe API calls across pages and pagination
 * windows. Aligns with storefront `revalidate = 60` on home/catalog routes.
 */
import { unstable_cache } from 'next/cache';

/** Seconds — matches public catalog/home ISR. */
export const SANITY_CATALOG_REVALIDATE_SECONDS = 60;

export function cacheSanityCatalog<T>(key: string, fn: () => Promise<T>): () => Promise<T> {
  return unstable_cache(fn, [`sanity-${key}`], {
    revalidate: SANITY_CATALOG_REVALIDATE_SECONDS,
    tags: ['sanity-catalog', `sanity-${key}`],
  });
}

/** Debug: log each Sanity GROQ fetch (CDN vs billable API). */
export function logSanityFetch(label: string, useCdn: boolean, query: string): void {
  // #region agent log
  fetch('http://127.0.0.1:7533/ingest/05e5fe92-ace3-44b7-a004-178e8286df2f', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '86b7c7' },
    body: JSON.stringify({
      sessionId: '86b7c7',
      location: 'lib/sanityCatalogCache.ts:logSanityFetch',
      message: 'Sanity fetch',
      data: {
        label,
        useCdn,
        queryPrefix: query.trim().slice(0, 48),
      },
      timestamp: Date.now(),
      hypothesisId: useCdn ? 'B-cdn' : 'A-api-no-cdn',
    }),
  }).catch(() => {});
  // #endregion
}

/** Debug: log when a cached catalog path is hit (no Sanity round-trip). */
export function logSanityCacheHit(label: string): void {
  // #region agent log
  fetch('http://127.0.0.1:7533/ingest/05e5fe92-ace3-44b7-a004-178e8286df2f', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '86b7c7' },
    body: JSON.stringify({
      sessionId: '86b7c7',
      location: 'lib/sanityCatalogCache.ts:logSanityCacheHit',
      message: 'Sanity cache hit (no fetch)',
      data: { label },
      timestamp: Date.now(),
      hypothesisId: 'C-unstable-cache',
    }),
  }).catch(() => {});
  // #endregion
}
