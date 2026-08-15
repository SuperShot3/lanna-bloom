import type { OrderPayload } from '@/lib/orders/types';

export const ADMIN_PAY_LINK_SOURCE = 'admin_pay_link' as const;
export const ADMIN_PAY_LINK_BOUQUET_ID = 'pay-link';
export const ADMIN_PAY_LINK_DESCRIPTION_MAX = 200;

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
