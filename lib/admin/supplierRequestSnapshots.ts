import 'server-only';
import type { CustomOrderDetails } from '@/lib/orders';
import type {
  OrderItemAddOnsDisplay,
  SupabaseOrderItemRow,
  SupabaseOrderRow,
} from '@/lib/supabase/adminQueries';
import type { OrderSummaryItemRow } from '@/lib/admin/orderSummaryPlainText';
import { itemsFromOrderJson } from '@/lib/admin/orderItemsFallback';
import { getBouquetById, getPlushyToyById, getProductById } from '@/lib/sanity';
import type { SupplierCatalogSnapshot } from '@/lib/supplierRequests';

type OrderJsonItem = {
  bouquetId?: string;
  bouquetTitle?: string;
  size?: string;
  price?: number;
  imageUrl?: string;
  bouquetSlug?: string;
  itemType?: string;
  cost?: number;
  commissionAmount?: number;
  addOns?: {
    cardType?: string | null;
    wrappingOption?: string | null;
    paperColor?: string | null;
    cardMessage?: string | null;
    balloonText?: string | null;
  };
};

function getOrderJsonItems(order: SupabaseOrderRow): OrderJsonItem[] {
  const payload = order.order_json as { items?: OrderJsonItem[] } | null | undefined;
  return Array.isArray(payload?.items) ? payload.items : [];
}

export function getCustomOrderDetails(order: SupabaseOrderRow): CustomOrderDetails | undefined {
  return (order.order_json as { customOrderDetails?: CustomOrderDetails } | null | undefined)
    ?.customOrderDetails;
}

export function resolveSupplierOrderItems(
  order: SupabaseOrderRow,
  dbItems: SupabaseOrderItemRow[]
): OrderSummaryItemRow[] {
  const jsonItems = getOrderJsonItems(order);
  const sourceItems =
    dbItems.length > 0 ? dbItems : jsonItems.length > 0 ? itemsFromOrderJson(order.order_id, jsonItems) : [];

  return sourceItems.map((item, index) => {
    const jsonItem = jsonItems[index];
    const addOns: OrderItemAddOnsDisplay | undefined = jsonItem?.addOns
      ? {
          cardType: jsonItem.addOns.cardType === 'premium' ? 'premium' : jsonItem.addOns.cardType === 'free' ? 'free' : undefined,
          wrappingOption: jsonItem.addOns.wrappingOption ?? undefined,
          cardMessage: jsonItem.addOns.cardMessage ?? undefined,
          balloonText: jsonItem.addOns.balloonText ?? undefined,
          paperColor: jsonItem.addOns.paperColor ?? undefined,
        }
      : undefined;
    return { ...item, addOns };
  });
}

function matchesSizeLabel(candidate: string | null | undefined, requested: string | null | undefined): boolean {
  const a = candidate?.trim().toLowerCase();
  const b = requested?.trim().toLowerCase();
  return Boolean(a && b && a === b);
}

export async function buildSupplierCatalogSnapshots(
  items: OrderSummaryItemRow[]
): Promise<Record<string, SupplierCatalogSnapshot>> {
  const entries = await Promise.all(
    items.map(async (item, index) => {
      const key = item.id != null ? String(item.id) : `${item.bouquet_id ?? 'item'}:${index}`;
      const itemType = item.item_type ?? 'bouquet';
      const id = item.bouquet_id?.trim();
      if (!id) return [key, {}] as const;

      if (itemType === 'product') {
        const product = await getProductById(id);
        return [
          key,
          {
            nameTh: product?.nameTh ?? null,
            preparationTimeMinutes: product?.preparationTime ?? null,
          },
        ] as const;
      }

      if (itemType === 'plushyToy') {
        const toy = await getPlushyToyById(id);
        return [key, { nameTh: toy?.nameTh ?? null }] as const;
      }

      const bouquet = await getBouquetById(id);
      const matchedSize = bouquet?.sizes.find((size) =>
        matchesSizeLabel(size.label, item.size) ||
        matchesSizeLabel(size.labelTh, item.size) ||
        matchesSizeLabel(size.key, item.size) ||
        matchesSizeLabel(size.optionId, item.size)
      );

      return [
        key,
        {
          nameTh: bouquet?.nameTh ?? null,
          sizeTh: matchedSize?.labelTh ?? null,
          preparationTimeMinutes: matchedSize?.preparationTime ?? null,
        },
      ] as const;
    })
  );

  return Object.fromEntries(entries);
}
