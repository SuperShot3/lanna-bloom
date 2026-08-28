import {
  CART_FIVE_PERCENT_CODE,
  getDiscountForCode,
  INTENT10_CODE,
} from '@/lib/referral';
import {
  isHeldManualPromoCode,
  resolveOrderDiscount,
  type ResolveOrderDiscountInput,
} from '@/lib/promo/resolveOrderDiscount';

export type ShouldApplyIntent10Input = Omit<ResolveOrderDiscountInput, 'referralCode'> & {
  storedReferralCode?: string | null;
};

function intent10Amount(input: ShouldApplyIntent10Input): number {
  const itemsTotal = input.itemsTotal;
  const deliveryFee = input.deliveryFee;
  const subtotal = itemsTotal + deliveryFee;
  if (subtotal <= 0) return 0;
  return getDiscountForCode(INTENT10_CODE, subtotal, {
    deliveryFee,
    itemSubtotal: itemsTotal,
    deliveryDestination: input.deliveryDestination,
    deliveryDateYmd: input.deliveryDateYmd,
    hasCatalogProductDiscount: input.hasCatalogProductDiscount,
    now: input.now,
  });
}

/**
 * Exclusive discounts: never stack.
 * Replace CART5 / empty cart with INTENT10 only when it is strictly better in THB
 * than the currently resolved campaign or CART5 amount.
 * Held customer codes (LANNABLOOM, welcome, peak promos, …) are never overwritten.
 */
export function shouldApplyIntent10(input: ShouldApplyIntent10Input): boolean {
  const intentAmount = intent10Amount(input);
  if (intentAmount <= 0) return false;

  const stored = input.storedReferralCode?.trim().toUpperCase() || null;
  if (stored === INTENT10_CODE) return true;

  if (
    stored &&
    stored !== CART_FIVE_PERCENT_CODE &&
    isHeldManualPromoCode(stored)
  ) {
    return false;
  }

  const current = resolveOrderDiscount({
    ...input,
    referralCode: stored === INTENT10_CODE ? null : stored,
  });
  const currentAmount = current?.discount ?? 0;
  return intentAmount > currentAmount;
}

export function intent10DiscountAmount(input: ShouldApplyIntent10Input): number {
  return intent10Amount(input);
}
