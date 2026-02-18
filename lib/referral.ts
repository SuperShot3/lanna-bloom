/**
 * Referral code system (MVP). Client-side only; no database.
 * Applied via input field on cart page. Stored in localStorage.
 */

export const REFERRAL_DISCOUNT_THB = 100;
const REFERRAL_STORAGE_KEY = 'lb_referral_code';

/** Allowed chars: A–Z, 0–9, hyphen (-). Length 3–12. Returns normalized code or null if invalid. */
export function validateReferralCode(code: string | null | undefined): { valid: true; code: string } | { valid: false; error?: string } {
  if (!code || typeof code !== 'string') return { valid: false, error: 'Please enter a code' };
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length < 3 || trimmed.length > 12) {
    return { valid: false, error: 'Code must be 3–12 characters' };
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
 * Compute referral discount. Does not stack with other discounts.
 * Returns discount amount (positive number) or 0. Capped at subtotal.
 */
export function computeReferralDiscount(
  cartTotal: number,
  hasReferral: boolean
): number {
  if (!hasReferral || cartTotal <= 0) return 0;
  return Math.min(REFERRAL_DISCOUNT_THB, cartTotal);
}
