/**
 * Shared Stripe Checkout line_items builder for cart and order-page flows.
 */

import type Stripe from 'stripe';
import type { ComputedOrderItem } from '@/lib/stripePricing';
import type { ReferralDiscountAllocation } from '@/lib/referral';
import { isValidLocale } from '@/lib/i18n';

export function buildStripeCheckoutLineItems(params: {
  computedItems: ComputedOrderItem[];
  deliveryFee: number;
  effectiveGrandTotal: number;
  referralCode?: string;
  referralDiscount: number;
  discountAllocation?: ReferralDiscountAllocation;
}): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const {
    computedItems,
    deliveryFee,
    effectiveGrandTotal,
    referralCode,
    referralDiscount,
    discountAllocation = 'all',
  } = params;

  const itemsSubtotal = computedItems.reduce((s, it) => s + it.price, 0);
  const subtotal = itemsSubtotal + deliveryFee;
  const discountBase =
    discountAllocation === 'items'
      ? itemsSubtotal
      : discountAllocation === 'delivery'
        ? deliveryFee
        : subtotal;
  const discountRatio = discountBase > 0 ? Math.min(referralDiscount, discountBase) / discountBase : 0;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = computedItems.map((item) => {
    const originalCents = Math.round(item.price * 100);
    const itemDiscountRatio = discountAllocation === 'delivery' ? 0 : discountRatio;
    const discountedCents = Math.max(0, Math.round(originalCents * (1 - itemDiscountRatio)));
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
    const deliveryDiscountRatio = discountAllocation === 'items' ? 0 : discountRatio;
    const discountedFeeCents = Math.max(0, Math.round(feeCents * (1 - deliveryDiscountRatio)));
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

/** Cart checkout: universal thank-you page (no checkout/complete in path — avoids GTM URL false positives). */
export function stripeCheckoutDraftSuccessUrl(baseUrl: string, lang: string): string {
  const l = isValidLocale(lang) ? lang : 'en';
  return `${baseUrl}/lanna-order-thank-you?session_id={CHECKOUT_SESSION_ID}&lang=${l}`;
}
