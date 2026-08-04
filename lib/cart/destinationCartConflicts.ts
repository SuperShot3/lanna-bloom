/**
 * Itemized cart vs delivery-destination conflicts (Feature 4).
 * Does not auto-remove lines; checkout should stay blocked while conflicts exist.
 */

import type { CartItem } from '@/contexts/CartContext';
import { getAddOnsTotal } from '@/lib/addonsConfig';
import { bouquetIsAvailableForDestination } from '@/lib/bouquetDestinationAvailability';
import { isNonBouquetCartLine } from '@/lib/cart/cartPriceBreakdown';
import {
  isExpansionDestination,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import {
  categoryAllowed,
  type ShopAccessProvince,
} from '@/lib/provinces/shopAccess';

export type DestinationCartConflictReason =
  | 'excluded_destination'
  | 'expansion_non_bouquet'
  | 'expansion_addons';

export type DestinationCartConflict = {
  index: number;
  bouquetId: string;
  slug: string;
  nameEn: string;
  nameTh: string;
  sizeLabel: string;
  reason: DestinationCartConflictReason;
  /** Extra lead time never fixes exclusion / wrong category / add-ons. */
  leadTimeWouldHelp: false;
  /** Customer action: remove/replace the line, or change region. */
  requiredAction: 'remove_or_change_region';
};

function cartItemCategoryKey(item: CartItem): string {
  const t = item.itemType ?? 'bouquet';
  if (t === 'plushyToy') return 'plushy_toys';
  if (t === 'balloon') return 'balloons';
  if (t === 'product') return 'gifts';
  return 'flowers';
}

/**
 * Analyze cart lines against the active delivery destination.
 * Pass province when available so `available_categories` can allow non-flower lines.
 */
export function analyzeDestinationCartConflicts(
  cartItems: CartItem[],
  destinationId: DeliveryDestinationId,
  province?: ShopAccessProvince | null
): DestinationCartConflict[] {
  const expansion = isExpansionDestination(destinationId);
  const conflicts: DestinationCartConflict[] = [];

  cartItems.forEach((item, index) => {
    const base = {
      index,
      bouquetId: item.bouquetId,
      slug: item.slug,
      nameEn: item.nameEn,
      nameTh: item.nameTh,
      sizeLabel: (item.size?.label || '').trim() || '—',
      leadTimeWouldHelp: false as const,
      requiredAction: 'remove_or_change_region' as const,
    };

    if (!isNonBouquetCartLine(item)) {
      if (
        !bouquetIsAvailableForDestination(
          { excludedDeliveryDestinations: item.excludedDeliveryDestinations },
          destinationId
        )
      ) {
        conflicts.push({ ...base, reason: 'excluded_destination' });
      }
      if (expansion && getAddOnsTotal(item.addOns?.productAddOns ?? {}) > 0) {
        conflicts.push({ ...base, reason: 'expansion_addons' });
      }
      return;
    }

    const allowed = categoryAllowed(province ?? null, cartItemCategoryKey(item), {
      isExpansionDestination: expansion,
    });
    if (!allowed) {
      conflicts.push({ ...base, reason: 'expansion_non_bouquet' });
    }
  });

  return conflicts;
}

export function cartHasDestinationConflicts(
  cartItems: CartItem[],
  destinationId: DeliveryDestinationId,
  province?: ShopAccessProvince | null
): boolean {
  return analyzeDestinationCartConflicts(cartItems, destinationId, province).length > 0;
}
