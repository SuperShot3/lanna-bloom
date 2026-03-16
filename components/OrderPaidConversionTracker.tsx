'use client';

import { useEffect, useRef } from 'react';
import { trackPurchase } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';

/**
 * Fires a single purchase event to dataLayer when the user views a paid order
 * (e.g. after Stripe redirect or when revisiting after admin marked paid).
 * GTM can fire on Custom Event = purchase to send to GA4.
 * Dedupe is per orderId inside trackPurchase.
 */
export function OrderPaidConversionTracker({
  orderId,
  value,
  currency = 'THB',
  items = [],
}: {
  orderId: string;
  value: number;
  currency?: string;
  /** Order line items for GA4 purchase event; optional. */
  items?: AnalyticsItem[];
}) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!orderId || value == null || value < 0 || firedRef.current) return;
    firedRef.current = true;
    trackPurchase({
      orderId,
      value,
      currency,
      items: Array.isArray(items) ? items : [],
      transactionId: orderId,
    });
  }, [orderId, value, currency, items]);

  return null;
}
