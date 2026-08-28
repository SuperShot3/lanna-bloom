import type { OrderPayload } from '@/lib/orders/types';

export const ADMIN_PAY_LINK_SOURCE = 'admin_pay_link' as const;
export const ADMIN_PAY_LINK_BOUQUET_ID = 'pay-link';
export const ADMIN_PAY_LINK_DESCRIPTION_MAX = 200;
/** Customer must pay within this window. After that the shop URL is disabled. */
export const PAY_LINK_TTL_MINUTES = 15;
export const PAY_LINK_TTL_MS = PAY_LINK_TTL_MINUTES * 60 * 1000;
/**
 * Stripe Checkout `expires_at` cannot be shorter than 30 minutes.
 * We still disable the shop URL at 15 minutes and expire the Stripe session via API.
 */
export const PAY_LINK_STRIPE_EXPIRES_MINUTES = 30;
export const STRIPE_PAY_LINK_SOURCE = 'lanna_bloom_pay_link' as const;

export function isPayLinkTimeExpired(
  createdAt: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  const t = createdAt ? Date.parse(createdAt) : NaN;
  if (!Number.isFinite(t)) return false;
  return nowMs - t >= PAY_LINK_TTL_MS;
}

export function isPayLinkManuallyDisabled(payload: {
  payLinkDisabledAt?: string | null;
}): boolean {
  return Boolean(payload.payLinkDisabledAt?.trim());
}

export function payLinkUnusableReason(
  payload: { payLinkDisabledAt?: string | null },
  createdAt: string | null | undefined,
  nowMs: number = Date.now()
): 'disabled' | 'expired' | null {
  if (isPayLinkManuallyDisabled(payload)) return 'disabled';
  if (isPayLinkTimeExpired(createdAt, nowMs)) return 'expired';
  return null;
}

export type PayLinkReceipt = {
  amount: number;
  description: string;
  orderId?: string;
};

export function payLinkDescriptionFromItems(items: Array<{ bouquetTitle?: string }> | undefined): string {
  const title = items?.[0]?.bouquetTitle;
  if (typeof title === 'string' && title.trim()) return title.trim();
  return 'Pay link';
}

export type AdminPayLinkInput = {
  amount: number;
  description: string;
  customerName?: string;
  customerEmail?: string;
  phone?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalTrimmed(raw: unknown, maxLen: number): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  return t.slice(0, maxLen);
}

export function validateAdminPayLinkInput(raw: {
  amount?: unknown;
  description?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
  phone?: unknown;
}): { ok: true; value: AdminPayLinkInput } | { ok: false; error: string } {
  const amountRaw = raw.amount;
  const amount =
    typeof amountRaw === 'number' ? amountRaw : parseFloat(String(amountRaw ?? ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'amount must be a positive number' };
  }
  const rounded = Math.round(amount * 100) / 100;
  if (rounded <= 0) {
    return { ok: false, error: 'amount must be a positive number' };
  }

  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  if (!description) {
    return { ok: false, error: 'description is required' };
  }
  if (description.length > ADMIN_PAY_LINK_DESCRIPTION_MAX) {
    return { ok: false, error: `description must be ${ADMIN_PAY_LINK_DESCRIPTION_MAX} characters or less` };
  }

  const customerEmail = optionalTrimmed(raw.customerEmail, 254);
  if (customerEmail && !EMAIL_RE.test(customerEmail)) {
    return { ok: false, error: 'customerEmail is not a valid email' };
  }

  const phone = optionalTrimmed(raw.phone, 32);
  const customerName = optionalTrimmed(raw.customerName, 120);

  return {
    ok: true,
    value: {
      amount: rounded,
      description,
      ...(customerName ? { customerName } : {}),
      ...(customerEmail ? { customerEmail } : {}),
      ...(phone ? { phone } : {}),
    },
  };
}

/** Synthetic unpaid order payload — no catalog product, no delivery date/zone. */
export function buildAdminPayLinkOrderPayload(input: AdminPayLinkInput): OrderPayload {
  return {
    ...(input.customerName ? { customerName: input.customerName } : {}),
    ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    items: [
      {
        bouquetId: ADMIN_PAY_LINK_BOUQUET_ID,
        bouquetTitle: input.description,
        size: '—',
        price: input.amount,
        addOns: { cardType: null, cardMessage: '', wrappingOption: null },
        itemType: 'product',
      },
    ],
    delivery: {
      address: '',
      preferredTimeSlot: '',
    },
    pricing: {
      itemsTotal: input.amount,
      deliveryFee: 0,
      grandTotal: input.amount,
    },
    orderSource: ADMIN_PAY_LINK_SOURCE,
  };
}

export function isAdminPayLinkOrder(order: {
  orderSource?: string | null;
  order_json?: { orderSource?: unknown } | null;
}): boolean {
  if (order.orderSource === ADMIN_PAY_LINK_SOURCE) return true;
  const fromJson = order.order_json?.orderSource;
  return fromJson === ADMIN_PAY_LINK_SOURCE;
}

/** Email the customer typed on Stripe Checkout (not a prefilled admin value). */
export function stripeCheckoutCustomerEmail(session: {
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
}): string | undefined {
  const raw = session.customer_details?.email?.trim() || session.customer_email?.trim() || '';
  if (!raw || !EMAIL_RE.test(raw)) return undefined;
  return raw.slice(0, 254);
}
