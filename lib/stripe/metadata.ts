import type Stripe from 'stripe';

export interface StripeOrderMetadataInput {
  orderId: string;
  source: string;
  customerEmail?: string;
  lang?: string;
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
