import {
  getDiscountAllocationForCode,
  getDiscountForCode,
  type ReferralDiscountAllocation,
} from '@/lib/referral';
import {
  MAY_FREE_DELIVERY_CODE,
  may2026FreeDeliveryDiscount,
} from '@/lib/promo/campaigns';

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
}

function manualDiscountForCode(
  code: string,
  subtotal: number,
  options: {
    deliveryFee: number;
    itemsTotal: number;
    deliveryDestination?: string;
  }
): number {
  return getDiscountForCode(code, subtotal, {
    deliveryFee: options.deliveryFee,
    itemSubtotal: options.itemsTotal,
    deliveryDestination: options.deliveryDestination,
  });
}

/**
 * Exclusive discount: manual/welcome promo wins over the May free-delivery campaign.
 * Client-safe (welcome codes use the WELCOME10- UI estimate when DB is unavailable).
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
  } = input;
  const subtotal = itemsTotal + deliveryFee;
  if (subtotal <= 0) return null;

  const normalizedCode = referralCode?.trim().toUpperCase();
  if (normalizedCode) {
    const discount = manualDiscountForCode(normalizedCode, subtotal, {
      deliveryFee,
      itemsTotal,
      deliveryDestination,
    });
    if (discount > 0) {
      return {
        code: normalizedCode,
        discount,
        allocation: getDiscountAllocationForCode(normalizedCode),
        source: 'manual',
      };
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
