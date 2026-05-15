import type { AnalyticsItem } from '@/lib/analytics';

/** Minimal order shape for GA4 purchase line items (order page + checkout-complete). */
export type OrderLikeForPurchase = {
  items?: Array<{
    bouquetId?: string;
    bouquetSlug?: string;
    bouquetTitle: string;
    size: string;
    price: number;
    itemType?: 'bouquet' | 'product' | 'plushyToy' | 'balloon';
  }>;
  pricing?: { itemsTotal?: number; deliveryFee?: number; grandTotal?: number };
  amountTotal?: number;
  currency?: string;
};

/** GA4 `purchase` items for a paid order; single fallback line when `items` is empty but total > 0. */
export function buildPurchaseAnalyticsItemsFromOrder(
  order: OrderLikeForPurchase,
  orderId: string,
): AnalyticsItem[] {
  const rows = order.items ?? [];
  const mapped = rows.map((item, index) => ({
    item_id: (item.bouquetId || item.bouquetSlug || `line_${index}`).trim() || `line_${index}`,
    item_name: item.bouquetTitle,
    price: item.price,
    quantity: 1 as const,
    index,
    item_variant: item.size,
    ...(item.itemType ? { item_category: item.itemType } : {}),
  }));
  const grandTotal = order.pricing?.grandTotal ?? order.amountTotal ?? 0;
  if (mapped.length === 0 && grandTotal > 0) {
    return [
      {
        item_id: orderId.trim() || 'order',
        item_name: 'Purchase',
        price: grandTotal,
        quantity: 1,
        index: 0,
      },
    ];
  }
  return mapped;
}

export function purchaseValueAndCurrencyFromOrder(order: OrderLikeForPurchase): {
  value: number;
  currency: string;
} {
  const value = order.pricing?.grandTotal ?? order.amountTotal ?? 0;
  const currency = (order.currency ?? 'THB').trim() || 'THB';
  return { value, currency };
}
