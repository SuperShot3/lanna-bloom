'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CartItem } from '@/contexts/CartContext';
import {
  computeDeliveryConstraint,
  type DeliveryConstraint,
  type ProvinceConstraintInput,
} from '@/lib/delivery/deliveryConstraints';
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

/**
 * Fetches public province config for the checkout destination and merges
 * with cart product deliveryOptions into a DeliveryConstraint.
 */
export function useProvinceDeliveryConstraint(
  destinationId: DeliveryDestinationId | string,
  items: CartItem[]
): {
  constraint: DeliveryConstraint;
  province: PublicProvince | null;
  loading: boolean;
} {
  const [province, setProvince] = useState<PublicProvince | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const dest = String(destinationId || '').trim().toUpperCase();
    if (!dest) {
      setProvince(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/provinces/by-destination/${encodeURIComponent(dest)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setProvince(null);
          return;
        }
        if (!res.ok) {
          setProvince(null);
          return;
        }
        const body = (await res.json()) as { province?: PublicProvince };
        setProvince(body.province ?? null);
      })
      .catch(() => {
        if (!cancelled) setProvince(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [destinationId]);

  const constraint = useMemo(
    () =>
      computeDeliveryConstraint({
        province: toProvinceInput(province),
        cartLines: items.map((item) => ({
          itemType: item.itemType,
          deliveryOptions: item.deliveryOptions,
        })),
      }),
    [province, items]
  );

  return { constraint, province, loading };
}
