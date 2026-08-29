import type Stripe from 'stripe';

const PAY_LINK_DRAFT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPayLinkDraftId(id: string): boolean {
  return PAY_LINK_DRAFT_ID_RE.test(id.trim());
}

export function stripeCustomerEmailOrOmit(email: string | null | undefined): string | undefined {
  const trimmed = email?.trim();
  return trimmed ? trimmed : undefined;
}

export function isReusableOpenPayLinkSession(session: {
  status?: string | null;
  url?: string | null;
}): session is { status: 'open'; url: string } {
  return session.status === 'open' && typeof session.url === 'string' && session.url.length > 0;
}

export function payLinkCheckoutIdempotencyKey(
  kind: 'draft' | 'order',
  id: string,
  deadSessionId?: string | null
): string {
  const prefix = kind === 'draft' ? 'pay-link-draft' : 'pay-link';
  const dead = deadSessionId?.trim();
  if (dead) return `${prefix}-${id}-${dead}`;
  return `${prefix}-${id}`;
}

export type PayLinkStoredSessionLookup =
  | { kind: 'open'; url: string }
  | { kind: 'dead'; sessionId: string }
  | { kind: 'none' };

export async function lookupStoredPayLinkCheckoutSession(
  retrieve: (id: string) => Promise<{ status?: string | null; url?: string | null }>,
  sessionId: string | null | undefined
): Promise<PayLinkStoredSessionLookup> {
  const id = sessionId?.trim();
  if (!id) return { kind: 'none' };
  try {
    const session = await retrieve(id);
    if (isReusableOpenPayLinkSession(session)) return { kind: 'open', url: session.url };
    return { kind: 'dead', sessionId: id };
  } catch {
    return { kind: 'dead', sessionId: id };
  }
}

/**
 * Stripe Checkout body for admin pay links.
 * No `expires_at` — a now-based timestamp breaks sticky idempotency keys.
 * Shop TTL (15 min) plus the expire-pay-links cron still close unused sessions.
 */
export function buildStablePayLinkCheckoutSessionParams(input: {
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  clientReferenceId: string;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Stripe.Checkout.SessionCreateParams {
  const customerEmail = stripeCustomerEmailOrOmit(input.customerEmail);
  return {
    mode: 'payment',
    line_items: input.lineItems,
    client_reference_id: input.clientReferenceId,
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: input.metadata,
    payment_intent_data: { metadata: input.metadata },
  };
}
