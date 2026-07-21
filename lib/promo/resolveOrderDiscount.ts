import {
  getDiscountAllocationForCode,
  getDiscountForCode,
  getDiscountCodeDefinition,
  type ReferralDiscountAllocation,
} from '@/lib/referral';
import {
  MAY_FREE_DELIVERY_CODE,
  may2026FreeDeliveryDiscount,
} from '@/lib/promo/campaigns';
import { isLannaBloomCouponCode } from '@/lib/promo/lannaBloomCoupon';

export type OrderDiscountSource = 'manual' | 'campaign';

export interface ResolvedOrderDiscount {
  code: string;
  discount: number;
  allocation: ReferralDiscountAllocation;
  source: OrderDiscountSource;
}

export interface ResolveOrderDiscountInput {
  itemsTotal: number;
  deliveryFee: number;
  referralCode?: string | null;
  deliveryDestination?: string;
  /** Server welcome-code validation only. */
  customerEmail?: string;
  now?: Date;
  /** Blocks LANNABLOOM when any cart line has a catalog % sale. */
  hasCatalogProductDiscount?: boolean;
}

function manualDiscountForCode(
  code: string,
  subtotal: number,
  options: {
    deliveryFee: number;
    itemsTotal: number;
    deliveryDestination?: string;
    hasCatalogProductDiscount?: boolean;
    now?: Date;
  }
): number {
  return getDiscountForCode(code, subtotal, {
    deliveryFee: options.deliveryFee,
    itemSubtotal: options.itemsTotal,
    deliveryDestination: options.deliveryDestination,
    hasCatalogProductDiscount: options.hasCatalogProductDiscount,
    now: options.now,
  });
}

function isHeldManualPromoCode(code: string): boolean {
  if (isLannaBloomCouponCode(code)) return true;
  if (getDiscountCodeDefinition(code)) return true;
  if (code.startsWith('WELCOME10-') && code.length > 'WELCOME10-'.length) return true;
  return false;
}

/**
 * Exclusive discount: manual/welcome promo wins over the May free-delivery campaign.
 * Client-safe (welcome codes use the WELCOME10- UI estimate when DB is unavailable).
 * A held allowlisted code (e.g. LANNABLOOM below min) blocks the auto campaign.
 */
export function resolveOrderDiscount(
  input: ResolveOrderDiscountInput
): ResolvedOrderDiscount | null {
  const {
    itemsTotal,
    deliveryFee,
    referralCode,
    deliveryDestination,
    now = new Date(),
    hasCatalogProductDiscount = false,
  } = input;
  const subtotal = itemsTotal + deliveryFee;
  if (subtotal <= 0) return null;

  const normalizedCode = referralCode?.trim().toUpperCase();
  if (normalizedCode) {
    const discount = manualDiscountForCode(normalizedCode, subtotal, {
      deliveryFee,
      itemsTotal,
      deliveryDestination,
      hasCatalogProductDiscount,
      now,
    });
    if (discount > 0) {
      return {
        code: normalizedCode,
        discount,
        allocation: getDiscountAllocationForCode(normalizedCode),
        source: 'manual',
      };
    }
    if (isHeldManualPromoCode(normalizedCode)) {
      return null;
    }
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
