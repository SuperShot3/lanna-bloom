import type { PublicProvince } from '@/lib/provinces/types';

const cache = new Map<string, PublicProvince | null>();
const inflight = new Map<string, Promise<PublicProvince | null>>();

function destKey(destinationId: string): string {
  return destinationId.trim().toUpperCase();
}

export function peekCachedPublicProvince(destinationId: string): PublicProvince | null | undefined {
  const key = destKey(destinationId);
  if (!key) return null;
  return cache.has(key) ? cache.get(key) : undefined;
}

export async function fetchPublicProvinceByDestinationClient(
  destinationId: string
): Promise<PublicProvince | null> {
  const key = destKey(destinationId);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  const existing = inflight.get(key);
  if (existing) return existing;

  const request = (async () => {
    try {
      const res = await fetch(`/api/provinces/by-destination/${encodeURIComponent(key)}`);
      if (res.status === 404) {
        cache.set(key, null);
        return null;
      }
      if (!res.ok) return null;
      const body = (await res.json()) as { province?: PublicProvince };
      const province = body.province ?? null;
      cache.set(key, province);
      return province;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}
