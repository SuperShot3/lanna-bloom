'use client';

/**
 * Fires GA4 purchase exactly once when the order details page is shown for a
 * confirmed-paid order. This is the only place purchase is sent; the
 * confirmation-pending (checkout) page never fires purchase.
 */

import { useEffect, useRef } from 'react';
import type { Order } from '@/lib/orders';
import { trackPurchase } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';
import { wasPurchaseSent } from '@/lib/analytics/gtag';

export function OrderPaidPurchaseTracker({ order }: { order: Order }) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (!order?.orderId || order.pricing?.grandTotal == null || !order.items?.length) return;
    const stableOrderId = (order.orderId as string).trim();
    if (sentRef.current) return;
    if (typeof window !== 'undefined' && wasPurchaseSent(stableOrderId)) {
      sentRef.current = true;
      return;
    }
    sentRef.current = true;
    const analyticsItems: AnalyticsItem[] = order.items.map((it, i) => ({
      item_id: it.bouquetId,
      item_name: it.bouquetTitle,
      item_variant: it.size,
      price: it.price,
      quantity: 1,
      index: i,
    }));
    trackPurchase({
      orderId: stableOrderId,
      value: order.pricing.grandTotal,
      currency: 'THB',
      items: analyticsItems,
      transactionId: stableOrderId,
    });
  }, [order]);

  return null;
}
