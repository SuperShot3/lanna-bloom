import type { DeliveryConstraint } from '@/lib/delivery/deliveryConstraints';
import type { ProvinceStatus } from '@/lib/provinces/types';

/** Server-facing message when province Pre-order Only blocks Stripe. */
export const PREORDER_STOCK_CONTACT_CHECKOUT_MESSAGE =
  'This delivery area currently requires a stock check before payment. Please contact us on LINE, WhatsApp, or email.';

const DISMISS_STORAGE_PREFIX = 'lanna-bloom-preorder-stock-contact:';

export function provinceStatusRequiresStockContact(
  status: ProvinceStatus | string | null | undefined
): boolean {
  return status === 'preorder_only';
}

export function deliveryConstraintRequiresStockContact(
  constraint: Pick<DeliveryConstraint, 'reasonCode'> | null | undefined
): boolean {
  return constraint?.reasonCode === 'preorder';
}

function storageKey(destinationId: string): string {
  return `${DISMISS_STORAGE_PREFIX}${destinationId.trim().toUpperCase()}`;
}

export function hasDismissedPreorderStockContact(destinationId: string): boolean {
  if (typeof window === 'undefined') return false;
  const dest = destinationId.trim();
  if (!dest) return false;
  try {
    return window.sessionStorage.getItem(storageKey(dest)) === '1';
  } catch {
    return false;
  }
}

export function markPreorderStockContactDismissed(destinationId: string): void {
  if (typeof window === 'undefined') return;
  const dest = destinationId.trim();
  if (!dest) return;
  try {
    window.sessionStorage.setItem(storageKey(dest), '1');
  } catch {
    // ignore quota / private mode
  }
}
