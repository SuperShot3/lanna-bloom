/**
 * Shared Stripe Checkout line_items builder for cart and order-page flows.
 */

import type Stripe from 'stripe';
import type { ComputedOrderItem } from '@/lib/stripePricing';

export function buildStripeCheckoutLineItems(params: {
  computedItems: ComputedOrderItem[];
  deliveryFee: number;
  effectiveGrandTotal: number;
  referralCode?: string;
  referralDiscount: number;
}): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const { computedItems, deliveryFee, effectiveGrandTotal, referralCode, referralDiscount } = params;

  const subtotal = computedItems.reduce((s, it) => s + it.price, 0) + deliveryFee;
  const discountRatio = subtotal > 0 ? referralDiscount / subtotal : 0;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = computedItems.map((item) => {
    const originalCents = Math.round(item.price * 100);
    const discountedCents = Math.max(0, Math.round(originalCents * (1 - discountRatio)));
    const productName =
      item.size === '—' || !item.size ? item.bouquetTitle : `${item.bouquetTitle} — ${item.size}`;
    return {
      price_data: {
        currency: 'thb',
        product_data: {
          name: productName,
          description:
            item.addOns?.cardType === 'premium' ? 'With premium message card' : undefined,
        },
        unit_amount: discountedCents,
      },
      quantity: 1,
    };
  });

  if (deliveryFee > 0) {
    const feeCents = Math.round(deliveryFee * 100);
    const discountedFeeCents = Math.max(0, Math.round(feeCents * (1 - discountRatio)));
    lineItems.push({
      price_data: {
        currency: 'thb',
        product_data: {
          name:
            referralDiscount > 0 && referralCode
              ? `Delivery fee (referral: ${referralCode})`
              : 'Delivery fee',
        },
        unit_amount: discountedFeeCents,
      },
      quantity: 1,
    });
  }

  const currentTotalCents = lineItems.reduce(
    (sum, li) => sum + (li.price_data as { unit_amount?: number }).unit_amount! * (li.quantity ?? 1),
    0
  );
  const targetCents = Math.round(effectiveGrandTotal * 100);
  const diff = targetCents - currentTotalCents;
  if (diff !== 0 && lineItems.length > 0) {
    const first = lineItems[0];
    const pd = first.price_data as { unit_amount?: number };
    const newAmount = Math.max(0, (pd.unit_amount ?? 0) + diff);
    pd.unit_amount = newAmount;
  }

  return lineItems;
}

/** Success redirect for Stripe Checkout: client can sync session and strip query params. */
export function stripeOrderSuccessUrl(
  baseUrl: string,
  orderId: string,
  options?: { checkoutToken?: string }
): string {
  const id = encodeURIComponent(orderId);
  const tokenQs =
    options?.checkoutToken && options.checkoutToken.length >= 8
      ? `checkout_token=${encodeURIComponent(options.checkoutToken)}&`
      : '';
  return `${baseUrl}/order/${id}?${tokenQs}stripe=success&session_id={CHECKOUT_SESSION_ID}`;
}
