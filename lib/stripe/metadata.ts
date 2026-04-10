import type Stripe from 'stripe';

export interface StripeOrderMetadataInput {
  orderId: string;
  source: string;
  customerEmail?: string;
  lang?: string;
  /** LINE Messaging API user id for post-payment push (optional). */
  lineUserId?: string;
}

function cleanValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildStripeOrderMetadata(input: StripeOrderMetadataInput): Record<string, string> {
  const metadata: Record<string, string> = {
    order_id: input.orderId.trim(),
    source: input.source.trim(),
  };

  const customerEmail = cleanValue(input.customerEmail);
  if (customerEmail) metadata.customer_email = customerEmail;

  const lang = cleanValue(input.lang);
  if (lang) metadata.lang = lang;

  const lineUserId = cleanValue(input.lineUserId);
  if (lineUserId) metadata.line_user_id = lineUserId;

  return metadata;
}

export function getOrderIdFromStripeMetadata(
  metadata?: Stripe.Metadata | Record<string, string> | null
): string | null {
  if (!metadata) return null;

  const orderId =
    ('order_id' in metadata && typeof metadata.order_id === 'string' ? metadata.order_id : null) ??
    ('orderId' in metadata && typeof metadata.orderId === 'string' ? metadata.orderId : null);

  const trimmed = orderId?.trim();
  return trimmed ? trimmed : null;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

/**
 * Stripe Checkout Session: resolve Lanna order id vs checkout draft id.
 * Prefer explicit order_id in metadata (order-page pay flow); otherwise draft UUID in metadata or client_reference_id.
 */
export function resolveStripeCheckoutSessionIds(session: {
  metadata?: Stripe.Metadata | Record<string, string> | null;
  client_reference_id?: string | null;
}): { orderId: string | null; checkoutDraftId: string | null } {
  const meta = session.metadata ?? {};
  const fromMeta = getOrderIdFromStripeMetadata(meta);
  if (fromMeta) {
    return { orderId: fromMeta, checkoutDraftId: null };
  }

  const draftFromMeta =
    'checkout_draft_id' in meta && typeof meta.checkout_draft_id === 'string'
      ? meta.checkout_draft_id.trim()
      : '';
  if (draftFromMeta) {
    return { orderId: null, checkoutDraftId: draftFromMeta };
  }

  const ref = session.client_reference_id?.trim() ?? '';
  if (ref.startsWith('LB-')) {
    return { orderId: ref, checkoutDraftId: null };
  }
  if (isUuidLike(ref)) {
    return { orderId: null, checkoutDraftId: ref };
  }

  return { orderId: null, checkoutDraftId: null };
}

export interface StripeCheckoutDraftMetadataInput {
  checkoutDraftId: string;
  submissionToken: string;
  source: string;
  customerEmail?: string;
  lang?: string;
  lineUserId?: string;
}

export function buildStripeCheckoutDraftMetadata(
  input: StripeCheckoutDraftMetadataInput
): Record<string, string> {
  const metadata: Record<string, string> = {
    checkout_draft_id: input.checkoutDraftId.trim(),
    submission_token: input.submissionToken.trim(),
    source: input.source.trim(),
  };

  const customerEmail = cleanValue(input.customerEmail);
  if (customerEmail) metadata.customer_email = customerEmail;

  const lang = cleanValue(input.lang);
  if (lang) metadata.lang = lang;

  const lineUserId = cleanValue(input.lineUserId);
  if (lineUserId) metadata.line_user_id = lineUserId;

  return metadata;
}
