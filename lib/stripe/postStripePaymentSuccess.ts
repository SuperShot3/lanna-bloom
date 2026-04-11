import 'server-only';

import { getOrderById, getOrderDetailsUrl } from '@/lib/orders';
import { sendCustomerConfirmationEmail } from '@/lib/orderEmail';
import { sendAdminNewOrderNotificationOnce } from '@/lib/orderNotification';
import { logLineIntegrationEvent } from '@/lib/line-integration/log';
import { queuePaymentNotificationForAgent } from '@/lib/line-notifications/pendingPayment';
/**
 * Shared side effects after an order is marked paid via Stripe (webhook, sync, or polling).
 * GA4 **purchase** is sent via GTM when the customer views the paid order page (`trackPurchase`), not Measurement Protocol.
 */
export async function runStripePostPaymentSuccessHooks(params: {
  orderId: string;
  amountTotal?: number;
  currency?: string;
  paymentIntentId?: string | null;
  paidAt: string;
  stripeSessionId?: string;
  trigger: 'stripe_webhook' | 'sync_checkout' | 'order_status';
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

  const publicOrderUrl = getOrderDetailsUrl(orderId);
  void sendAdminNewOrderNotificationOnce(orderId).catch((e) => {
    console.error('[stripe/postPayment] Admin new-order notification failed:', e);
  });
  sendCustomerConfirmationEmail(updatedOrder, publicOrderUrl).catch((e) => {
    console.error('[stripe/postPayment] Customer confirmation email failed:', e);
  });

  const lineUid = updatedOrder.lineUserId?.trim();
  if (lineUid) {
    const { queued } = await queuePaymentNotificationForAgent(orderId, lineUid, publicOrderUrl);
    if (queued) {
      await logLineIntegrationEvent('payment_notify_queued_for_agent', {
        lineUserId: lineUid,
        orderId,
      });
    }
  }

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
      createdBy,
    }).catch((e) => console.error('[stripe/postPayment] income upsert error:', e))
  );
}
