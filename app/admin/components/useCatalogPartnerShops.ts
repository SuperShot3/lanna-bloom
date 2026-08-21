'use client';

import { useEffect, useState } from 'react';
import type { CatalogPartnerShop } from '@/lib/admin/catalogPartnerShopTypes';

export function useCatalogPartnerShops(): CatalogPartnerShop[] {
  const [shops, setShops] = useState<CatalogPartnerShop[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/admin/partners/shops', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const rows = Array.isArray(data.shops) ? data.shops : [];
        const shops = rows
          .map((row: { id?: unknown; name?: unknown }) => ({
            id: typeof row.id === 'string' ? row.id : '',
            name: typeof row.name === 'string' ? row.name.trim() : '',
          }))
          .filter((row: CatalogPartnerShop) => row.id && row.name);
        if (!cancelled) setShops(shops);
      } catch {
        if (!cancelled) setShops([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return shops;
}

export function findPartnerShop(
  shops: CatalogPartnerShop[],
  shopId: string | null | undefined
): CatalogPartnerShop | undefined {
  const id = shopId?.trim();
  if (!id) return undefined;
  return shops.find((shop) => shop.id === id);
}

export function findPartnerShopByName(
  shops: CatalogPartnerShop[],
  shopName: string | null | undefined
): CatalogPartnerShop | undefined {
  const name = shopName?.trim().toLowerCase();
  if (!name) return undefined;
  return shops.find((shop) => shop.name.toLowerCase() === name);
}
