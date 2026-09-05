'use client';

import { useEffect, useState } from 'react';
import { fetchPublicProvinceByDestinationClient } from '@/lib/delivery/fetchPublicProvinceClient';
import { provinceStatusRequiresStockContact } from '@/lib/delivery/preorderStockContact';

/**
 * True when the selected destination's live province status is Pre-order Only.
 * Shared across catalog cards (one network request per destination).
 */
export function useProvinceRequiresStockContact(destinationId: string): {
  requiresContact: boolean;
  loading: boolean;
} {
  const dest = String(destinationId || '').trim().toUpperCase();
  const [requiresContact, setRequiresContact] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(dest));

  useEffect(() => {
    let cancelled = false;
    if (!dest) {
      setRequiresContact(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchPublicProvinceByDestinationClient(dest)
      .then((province) => {
        if (cancelled) return;
        setRequiresContact(provinceStatusRequiresStockContact(province?.status));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dest]);

  return { requiresContact, loading };
}
