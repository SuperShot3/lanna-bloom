import 'server-only';

import {
  getDiscountAllocationForCode,
  type ResolvedOrderDiscount,
  type ResolveOrderDiscountInput,
} from '@/lib/promo/resolveOrderDiscount';
import { isWelcomeCode, lookupDbWelcomeCode } from '@/lib/promo/welcomeCode';
import {
  MAY_FREE_DELIVERY_CODE,
  may2026FreeDeliveryDiscount,
} from '@/lib/promo/campaigns';
import { getDiscountForCode } from '@/lib/referral';

/** Server checkout: includes DB-backed welcome codes. Manual promo always beats campaign. */
export async function resolveOrderDiscountServer(
  input: ResolveOrderDiscountInput
): Promise<ResolvedOrderDiscount | null> {
  const {
    itemsTotal,
    deliveryFee,
    referralCode,
    deliveryDestination,
    customerEmail,
    now = new Date(),
  } = input;
  const subtotal = itemsTotal + deliveryFee;
  if (subtotal <= 0) return null;

  const normalizedCode = referralCode?.trim().toUpperCase();
  if (normalizedCode) {
    let discount = getDiscountForCode(normalizedCode, subtotal, {
      deliveryFee,
      itemSubtotal: itemsTotal,
      deliveryDestination,
    });

    if (discount <= 0 && isWelcomeCode(normalizedCode)) {
      if (!customerEmail?.trim()) {
        return null;
      }
      const db = await lookupDbWelcomeCode(normalizedCode);
      if (!db.valid) {
        return null;
      }
      if (db.email !== customerEmail.trim().toLowerCase()) {
        return null;
      }
      if (db.discountType === 'percent') {
        discount = Math.min(Math.floor((subtotal * db.discountValue) / 100), subtotal);
      } else if (db.discountType === 'free_delivery') {
        discount = Math.min(Math.max(0, deliveryFee), subtotal);
      } else {
        discount = Math.min(Math.max(0, db.discountValue), subtotal);
      }
    }

    if (discount > 0) {
      return {
        code: normalizedCode,
        discount,
        allocation: getDiscountAllocationForCode(normalizedCode),
        source: 'manual',
      };
    }
    return null;
  }

  const campaignDiscount = may2026FreeDeliveryDiscount(itemsTotal, deliveryFee, now);
  if (campaignDiscount > 0) {
    return {
      code: MAY_FREE_DELIVERY_CODE,
      discount: campaignDiscount,
      allocation: 'delivery',
      source: 'campaign',
    };
  }

  return null;
}
