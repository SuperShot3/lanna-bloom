/**
 * Promo codes (MVP). Applied via cart; stored in localStorage.
 * Only keys listed in DISCOUNT_CODES receive a discount; unknown codes get 0.
 */

const REFERRAL_STORAGE_KEY = 'lb_referral_code';

type DiscountCodeDefinition =
  | {
      type: 'percent';
      value: number;
      discountBase?: 'cart' | 'items';
      allowedDeliveryDestinations?: string[];
      affiliate?: {
        name: string;
        commissionPercent: number;
      };
    }
  | {
      type: 'fixed';
      value: number;
      allowedDeliveryDestinations?: string[];
      affiliate?: {
        name: string;
        commissionPercent: number;
      };
    }
  | { type: 'free_delivery'; allowedDeliveryDestinations?: string[] };

export type ReferralDiscountAllocation = 'all' | 'items' | 'delivery';

export interface ReferralCommission {
  partnerName: string;
  commissionPercent: number;
  commissionAmount: number;
}

/** One-click cart offer — applied via the checkout discount button. */
export const CART_FIVE_PERCENT_CODE = 'CART5';

export function isCartFivePercentCode(code: string | null | undefined): boolean {
  return code?.trim().toUpperCase() === CART_FIVE_PERCENT_CODE;
}

/** Promo code allowlist (MVP). Newsletter welcome codes are DB-backed and unique (WELCOME10-XXXXXX). */
const DISCOUNT_CODES: Record<string, DiscountCodeDefinition> = {
  'LB-DELIVERY-FREE': { type: 'free_delivery' },
  /** Standalone free delivery (any date; not tied to May campaign rules). */
  'LB-DELIVERY-FREE-2026': { type: 'free_delivery' },
  /** May 2026 auto free-delivery campaign (applied server-side when eligible; not entered by customer). */
  'MAY26-FREEDEL': { type: 'free_delivery' },
  VASILIY10: {
    type: 'percent',
    value: 10,
    discountBase: 'items',
    allowedDeliveryDestinations: ['PHUKET'],
    affiliate: {
      name: 'Vasiliy',
      commissionPercent: 5,
    },
  },
  [CART_FIVE_PERCENT_CODE]: {
    type: 'percent',
    value: 5,
    discountBase: 'items',
  },
};

const REFERRAL_CODE_MAX_LENGTH = 24;

/** Allowed chars: A-Z, 0-9, hyphen (-). Length 3–24. Returns normalized code or null if invalid. */
export function validateReferralCode(code: string | null | undefined): { valid: true; code: string } | { valid: false; error?: string } {
  if (!code || typeof code !== 'string') return { valid: false, error: 'Please enter a code' };
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length < 3 || trimmed.length > REFERRAL_CODE_MAX_LENGTH) {
    return { valid: false, error: `Code must be 3-${REFERRAL_CODE_MAX_LENGTH} characters` };
  }
  if (!/^[A-Z0-9-]+$/.test(trimmed)) {
    return { valid: false, error: 'Code can only contain letters, numbers, and hyphens' };
  }
  return { valid: true, code: trimmed };
}

export interface StoredReferral {
  code: string;
}

/** Get stored referral from localStorage. Client-only. */
export function getStoredReferral(): StoredReferral | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!raw) return null;
    const code = raw.trim().toUpperCase();
    const result = validateReferralCode(code);
    if (!result.valid) {
      clearReferral();
      return null;
    }
    return { code: result.code };
  } catch {
    return null;
  }
}

/** Clear stored referral. Client-only. */
export function clearReferral(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Store referral code. Client-only. Call after validating. */
export function storeReferral(code: string): void {
  if (typeof window === 'undefined') return;
  const result = validateReferralCode(code);
  if (!result.valid) return;
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, result.code);
  } catch {
    // ignore
  }
}

/**
 * Compute discount for a given code and subtotal. Server-safe (no localStorage).
 * Returns discount amount (positive number) or 0. Capped at subtotal.
 */
export function getDiscountForCode(
  code: string,
  subtotal: number,
  options: { deliveryFee?: number; itemSubtotal?: number; deliveryDestination?: string } = {}
): number {
  if (!code || subtotal <= 0) return 0;
  const normalized = code.trim().toUpperCase();
  // Client-side estimate for unique newsletter welcome codes.
  // Server-side validation is DB-backed (single-use + expiry), so this only drives UI display.
  if (normalized.startsWith('WELCOME10-') && normalized.length > 'WELCOME10-'.length) {
    return Math.min(Math.floor((subtotal * 10) / 100), subtotal);
  }
  const def = DISCOUNT_CODES[normalized];
  if (def) {
    if (
      def.allowedDeliveryDestinations?.length &&
      !def.allowedDeliveryDestinations.includes((options.deliveryDestination ?? '').toUpperCase())
    ) {
      return 0;
    }
    if (def.type === 'percent') {
      const base =
        def.discountBase === 'items'
          ? Math.max(0, options.itemSubtotal ?? subtotal - (options.deliveryFee ?? 0))
          : subtotal;
      return Math.min(Math.floor((base * def.value) / 100), subtotal);
    }
    if (def.type === 'free_delivery') {
      return Math.min(Math.max(0, options.deliveryFee ?? 0), subtotal);
    }
    return Math.min(def.value, subtotal);
  }
  return 0;
}

export function getDiscountAllocationForCode(code: string): ReferralDiscountAllocation {
  const normalized = code.trim().toUpperCase();
  const def = DISCOUNT_CODES[normalized];
  if (!def) return 'all';
  if (def.type === 'free_delivery') return 'delivery';
  if (def.type === 'percent' && def.discountBase === 'items') return 'items';
  return 'all';
}

export function getReferralCommissionForCode(
  code: string | null | undefined,
  itemSubtotal: number,
  options: { deliveryDestination?: string } = {}
): ReferralCommission | null {
  if (!code || itemSubtotal <= 0) return null;
  const normalized = code.trim().toUpperCase();
  const def = DISCOUNT_CODES[normalized];
  if (!def || !('affiliate' in def) || !def.affiliate) return null;
  if (
    def.allowedDeliveryDestinations?.length &&
    !def.allowedDeliveryDestinations.includes((options.deliveryDestination ?? '').toUpperCase())
  ) {
    return null;
  }
  const commissionAmount = Math.round((itemSubtotal * def.affiliate.commissionPercent) / 100);
  if (commissionAmount <= 0) return null;
  return {
    partnerName: def.affiliate.name,
    commissionPercent: def.affiliate.commissionPercent,
    commissionAmount,
  };
}

/**
 * Compute referral discount. Does not stack with other discounts.
 * Returns discount amount (positive number) or 0. Capped at subtotal.
 */
export function computeReferralDiscount(
  cartTotal: number,
  referral: StoredReferral | null,
  options: { deliveryFee?: number; itemSubtotal?: number; deliveryDestination?: string } = {}
): number {
  if (!referral || cartTotal <= 0) return 0;
  return getDiscountForCode(referral.code, cartTotal, options);
}
