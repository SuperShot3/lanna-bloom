import 'server-only';

import { getOrderById, getOrderDetailsUrl, getOrderPublicToken } from '@/lib/orders';
import { sendCustomerConfirmationEmail } from '@/lib/orderEmail';
import { sendAdminNewOrderNotificationOnce } from '@/lib/orderNotification';
import {
  scheduleGa4PurchaseFallback,
  tryProcessGa4PurchaseFallback,
} from '@/lib/analytics/ga4PurchaseFallback';

/**
 * Shared side effects after an order is marked paid via Stripe (webhook, sync, or order-status poll).
 * Browser **`purchase`** is sent from `/lanna-order-thank-you` → GTM. Measurement Protocol fallback
 * runs server-side when browser tracking does not confirm within the delay window.
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

  void scheduleGa4PurchaseFallback(orderId).catch((e) =>
    console.error('[stripe/postPayment] scheduleGa4PurchaseFallback error:', e),
  );
  void tryProcessGa4PurchaseFallback(orderId).catch((e) =>
    console.error('[stripe/postPayment] tryProcessGa4PurchaseFallback error:', e),
  );
}
