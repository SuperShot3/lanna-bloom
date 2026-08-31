import 'server-only';

import { getCheckoutDraftRecordById } from '@/lib/checkout/checkoutDrafts';
import { getOrderByIdWithPublicToken } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import {
  isAdminPayLinkOrder,
  payLinkDescriptionFromItems,
  payLinkUnusableReason,
} from '@/lib/payLinks/adminPayLink';
import { paidPayLinkReceiptForToken } from '@/lib/payLinks/completePayLinkReturn';
import { isPayLinkDraftId } from '@/lib/payLinks/payLinkCheckoutSession';
import { payLinkTokensEqual } from '@/lib/payLinks/payLinkCrypto';
import type { PayLinkShareDetails } from '@/lib/payLinks/payLinkShareMetadata';

function detailsFromAmount(
  amount: number,
  description: string
): PayLinkShareDetails | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const trimmed = description.trim();
  return {
    amount,
    description: trimmed || 'Payment',
  };
}

/**
 * Active unpaid pay-link facts for Open Graph only.
 * Missing / invalid / paid / expired / disabled → null (generic branded card).
 * Does not expire Stripe sessions (no metadata side effects).
 */
export async function resolveActivePayLinkShareDetails(
  linkId: string,
  token: string
): Promise<PayLinkShareDetails | null> {
  const id = linkId.trim();
  const publicToken = token.trim();
  if (!id || !publicToken) return null;

  try {
    if (isPayLinkDraftId(id)) {
      const paid = await paidPayLinkReceiptForToken(publicToken);
      if (paid) return null;

      const record = await getCheckoutDraftRecordById(id);
      if (!record || !isAdminPayLinkOrder(record.payload)) return null;
      if (!payLinkTokensEqual(record.payload.payLinkPublicToken, publicToken)) return null;
      if (payLinkUnusableReason(record.payload, record.createdAt)) return null;

      const amount =
        record.payload.pricing?.grandTotal ?? record.payload.items?.[0]?.price ?? 0;
      return detailsFromAmount(amount, payLinkDescriptionFromItems(record.payload.items));
    }

    const order = await getOrderByIdWithPublicToken(id, publicToken);
    if (!order || !isAdminPayLinkOrder(order)) return null;

    const supabasePayment = await getSupabasePaymentStatusByOrderId(order.orderId);
    const paid =
      (supabasePayment?.payment_status ?? '').toUpperCase() === 'PAID' ||
      order.status === 'paid' ||
      Boolean(supabasePayment?.paid_at ?? order.paidAt);
    if (paid) return null;
    if (payLinkUnusableReason(order, order.createdAt)) return null;

    const amount = order.pricing?.grandTotal ?? order.items?.[0]?.price ?? 0;
    return detailsFromAmount(amount, payLinkDescriptionFromItems(order.items));
  } catch {
    return null;
  }
}
