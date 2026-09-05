'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  computeDeliveryConstraint,
  type CartLineDeliveryConstraintInput,
  type DeliveryConstraint,
  type ProvinceConstraintInput,
} from '@/lib/delivery/deliveryConstraints';
import {
  bouquetIdsForDeliveryOptionsLookup,
  mergeCartLinesWithCatalogOptions,
} from '@/lib/delivery/mergeCartLineDeliveryOptions';
import { fetchPublicProvinceByDestinationClient } from '@/lib/delivery/fetchPublicProvinceClient';
import type { PublicProvince } from '@/lib/provinces/types';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';

function toProvinceInput(p: PublicProvince | null): ProvinceConstraintInput {
  if (!p) return null;
  return {
    status: p.status,
    catalog_enabled: p.catalog_enabled,
    min_advance_notice_hours: p.min_advance_notice_hours,
    same_day_cutoff_local: p.same_day_cutoff_local,
    customer_message_en: p.customer_message_en,
    customer_message_th: p.customer_message_th,
    delivery_limitations_en: p.delivery_limitations_en,
    delivery_limitations_th: p.delivery_limitations_th,
  };
}

function bouquetIdsKey(items: CartLineDeliveryConstraintInput[]): string {
  return bouquetIdsForDeliveryOptionsLookup(items).sort().join(',');
}

/**
 * Fetches public province config + catalog bouquet delivery_options for the
 * destination/cart, then merges into a DeliveryConstraint (catalog wins).
 */
export function useProvinceDeliveryConstraint(
  destinationId: DeliveryDestinationId | string,
  items: CartLineDeliveryConstraintInput[]
): {
  constraint: DeliveryConstraint;
  province: PublicProvince | null;
  loading: boolean;
} {
  const idsKey = bouquetIdsKey(items);

  const [province, setProvince] = useState<PublicProvince | null>(null);
  const [catalogOptions, setCatalogOptions] = useState<Record<string, string[]> | null>(
    null
  );
  const [provinceLoading, setProvinceLoading] = useState(() =>
    Boolean(String(destinationId || '').trim())
  );
  const [catalogLoading, setCatalogLoading] = useState(() => Boolean(idsKey));

  useEffect(() => {
    let cancelled = false;
    const dest = String(destinationId || '').trim().toUpperCase();
    if (!dest) {
      setProvince(null);
      setProvinceLoading(false);
      return;
    }

    setProvinceLoading(true);
    fetchPublicProvinceByDestinationClient(dest)
      .then((next) => {
        if (!cancelled) setProvince(next);
      })
      .finally(() => {
        if (!cancelled) setProvinceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [destinationId]);

  useEffect(() => {
    let cancelled = false;
    const ids = idsKey ? idsKey.split(',').filter(Boolean) : [];
    if (ids.length === 0) {
      setCatalogOptions(null);
      setCatalogLoading(false);
      return;
    }

    setCatalogLoading(true);
    fetch(`/api/catalog/bouquet-delivery-options?ids=${encodeURIComponent(ids.join(','))}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setCatalogOptions(null);
          return;
        }
        const body = (await res.json()) as { options?: Record<string, string[]> };
        setCatalogOptions(body.options ?? null);
      })
      .catch(() => {
        if (!cancelled) setCatalogOptions(null);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const cartLines = useMemo(
    () => mergeCartLinesWithCatalogOptions(items, catalogOptions),
    [items, catalogOptions]
  );

  const constraint = useMemo(
    () =>
      computeDeliveryConstraint({
        province: toProvinceInput(province),
        cartLines,
      }),
    [province, cartLines]
  );

  const loading = provinceLoading || catalogLoading;

  return { constraint, province, loading };
}
