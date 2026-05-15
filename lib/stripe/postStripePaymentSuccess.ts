import 'server-only';

import { getOrderById, getOrderDetailsUrl, getOrderPublicToken } from '@/lib/orders';
import { sendCustomerConfirmationEmail } from '@/lib/orderEmail';
import { sendAdminNewOrderNotificationOnce } from '@/lib/orderNotification';
import type { PurchaseSource } from '@/lib/ga4/sendPurchaseForOrder';

function triggerToPurchaseSource(
  trigger: 'stripe_webhook' | 'sync_checkout' | 'order_status'
): PurchaseSource {
  if (trigger === 'stripe_webhook') return 'stripe_webhook';
  if (trigger === 'sync_checkout') return 'stripe_sync_checkout';
  return 'stripe_order_status';
}

/**
 * Shared side effects after an order is marked paid via Stripe (webhook, sync, or order-status poll).
 * Browser **`purchase`** still goes through the paid order page → GTM. Optionally, GA4 **Measurement
 * Protocol** runs here when configured (`sendPurchaseForOrder`); it is idempotent per order in the DB.
 */
export async function runStripePostPaymentSuccessHooks(params: {
  orderId: string;
  amountTotal?: number;
  currency?: string;
  paymentIntentId?: string | null;
  paidAt: string;
  stripeSessionId?: string;
  trigger: 'stripe_webhook' | 'sync_checkout' | 'order_status';
  /** From Stripe Balance Transaction when available; income record uses estimate if omitted. */
  stripeProcessingFeeMajor?: number | null;
}): Promise<void> {
  const orderId = params.orderId.trim();

  const mpSource = triggerToPurchaseSource(params.trigger);
  void import('@/lib/ga4/sendPurchaseForOrder').then(({ sendPurchaseForOrder }) =>
    sendPurchaseForOrder(orderId, mpSource).catch((e) =>
      console.error('[stripe/postPayment] GA4 Measurement Protocol purchase error:', e)
    )
  );

  void import('@/lib/supabase/orderAdapter').then(({ syncSupabasePaymentSuccess }) =>
    syncSupabasePaymentSuccess(
      orderId,
      params.paymentIntentId ?? undefined,
      params.paidAt,
      params.stripeSessionId
    ).catch((e) => console.error('[stripe/postPayment] syncSupabasePaymentSuccess error:', e))
  );

  const updatedOrder = await getOrderById(orderId);
  if (!updatedOrder) return;

  const publicToken = await getOrderPublicToken(orderId);
  const publicOrderUrl = getOrderDetailsUrl(orderId, { token: publicToken });
  void sendAdminNewOrderNotificationOnce(orderId).catch((e) => {
    console.error('[stripe/postPayment] Admin new-order notification failed:', e);
  });
  sendCustomerConfirmationEmail(updatedOrder, publicOrderUrl).catch((e) => {
    console.error('[stripe/postPayment] Customer confirmation email failed:', e);
  });

  const createdBy =
    params.trigger === 'stripe_webhook'
      ? 'system:stripe_webhook'
      : params.trigger === 'sync_checkout'
        ? 'system:sync_checkout'
        : 'system:order_status';

  void import('@/lib/accounting/upsertOrderIncome').then(({ upsertOrderIncome }) =>
    upsertOrderIncome({
      orderId,
      amount: params.amountTotal ?? 0,
      currency: params.currency ?? 'THB',
      paymentMethod: 'STRIPE',
      stripePaymentIntentId: params.paymentIntentId ?? null,
      paidAt: params.paidAt,
      createdBy,
      stripeProcessingFeeMajor: params.stripeProcessingFeeMajor,
    }).catch((e) => console.error('[stripe/postPayment] income upsert error:', e))
  );
}
