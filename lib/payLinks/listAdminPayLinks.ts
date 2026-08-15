import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { ADMIN_PAY_LINK_SOURCE, payLinkUnusableReason } from '@/lib/payLinks/adminPayLink';
import { getPayLinkUrl } from '@/lib/orders';
import { listPayLinkCheckoutDrafts } from '@/lib/checkout/checkoutDrafts';
import type { OrderPayload } from '@/lib/orders/types';

export type AdminPayLinkListRow = {
  id: string;
  kind: 'draft' | 'order';
  orderId: string | null;
  description: string;
  amount: number;
  paymentStatus: 'PAID' | 'NOT_PAID';
  linkStatus: 'active' | 'paid' | 'expired' | 'disabled';
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string | null;
  paidAt: string | null;
  paymentFee: number | null;
  reviewUrl: string;
  canDisable: boolean;
  canCopy: boolean;
};

function descriptionFromPayload(payload: OrderPayload | Record<string, unknown> | null | undefined): string {
  const items = payload && 'items' in payload ? payload.items : undefined;
  if (Array.isArray(items) && items[0] && typeof items[0] === 'object') {
    const title = (items[0] as { bouquetTitle?: unknown }).bouquetTitle;
    if (typeof title === 'string' && title.trim()) return title.trim();
  }
  return 'Pay link';
}

function payLinkTokenFromPayload(payload: OrderPayload | Record<string, unknown>): string | null {
  const t =
    payload && typeof payload === 'object' && 'payLinkPublicToken' in payload
      ? (payload as { payLinkPublicToken?: unknown }).payLinkPublicToken
      : undefined;
  return typeof t === 'string' && t.trim() ? t.trim() : null;
}

export async function findPaidPayLinkOrderByPublicToken(token: string): Promise<{
  orderId: string;
  publicToken: string | null;
  amount: number;
  description: string;
} | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const trimmed = token.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('orders')
    .select('order_id, public_token, payment_status, grand_total, order_json')
    .contains('order_json', { orderSource: ADMIN_PAY_LINK_SOURCE, payLinkPublicToken: trimmed })
    .eq('payment_status', 'PAID')
    .limit(1)
    .maybeSingle();

  if (error || !data?.order_id) {
    if (error) console.error('[findPaidPayLinkOrderByPublicToken]', error.message);
    return null;
  }
  const json = (data.order_json ?? null) as OrderPayload | null;
  return {
    orderId: String(data.order_id),
    publicToken: data.public_token != null ? String(data.public_token) : null,
    amount: parseFloat(String(data.grand_total ?? 0)) || 0,
    description: descriptionFromPayload(json),
  };
}

export async function listAdminPayLinks(opts?: {
  paymentStatus?: 'PAID' | 'NOT_PAID' | 'all';
  limit?: number;
}): Promise<{ rows: AdminPayLinkListRow[]; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { rows: [], error: 'Supabase not configured' };

  const limit = Math.min(200, Math.max(1, opts?.limit ?? 80));
  const wantDrafts = opts?.paymentStatus !== 'PAID';
  const wantOrders = true;

  const rows: AdminPayLinkListRow[] = [];

  if (wantDrafts) {
    try {
      const drafts = await listPayLinkCheckoutDrafts(limit);
      for (const draft of drafts) {
        const token = payLinkTokenFromPayload(draft.payload);
        const unusable = payLinkUnusableReason(draft.payload, draft.createdAt);
        const linkStatus = unusable === 'disabled' ? 'disabled' : unusable === 'expired' ? 'expired' : 'active';
        rows.push({
          id: draft.id,
          kind: 'draft',
          orderId: null,
          description: descriptionFromPayload(draft.payload),
          amount: draft.payload.pricing?.grandTotal ?? draft.payload.items?.[0]?.price ?? 0,
          paymentStatus: 'NOT_PAID',
          linkStatus,
          customerName: draft.payload.customerName ?? null,
          customerEmail: draft.payload.customerEmail ?? null,
          createdAt: draft.createdAt || null,
          paidAt: null,
          paymentFee: null,
          reviewUrl: getPayLinkUrl(draft.id, { token }),
          canDisable: linkStatus === 'active',
          canCopy: linkStatus === 'active',
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to list pay link drafts';
      console.error('[listAdminPayLinks] drafts', message);
      return { rows: [], error: message };
    }
  }

  if (wantOrders) {
    let query = supabase
      .from('orders')
      .select(
        'order_id, public_token, payment_status, grand_total, customer_name, customer_email, created_at, paid_at, payment_fee, order_json'
      )
      .contains('order_json', { orderSource: ADMIN_PAY_LINK_SOURCE })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (opts?.paymentStatus === 'PAID') {
      query = query.eq('payment_status', 'PAID');
    } else if (opts?.paymentStatus === 'NOT_PAID') {
      query = query.eq('payment_status', 'NOT_PAID');
    }

    const { data, error } = await query;
    if (error) {
      console.error('[listAdminPayLinks]', error.message);
      return { rows: [], error: error.message };
    }

    for (const row of data ?? []) {
      const json = (row.order_json ?? null) as OrderPayload | null;
      const token = typeof row.public_token === 'string' ? row.public_token : payLinkTokenFromPayload(json ?? {});
      const status = String(row.payment_status ?? 'NOT_PAID').toUpperCase() === 'PAID' ? 'PAID' : 'NOT_PAID';
      if (opts?.paymentStatus === 'PAID' && status !== 'PAID') continue;
      if (opts?.paymentStatus === 'NOT_PAID' && status === 'PAID') continue;
      const orderId = String(row.order_id);
      rows.push({
        id: orderId,
        kind: 'order',
        orderId,
        description: descriptionFromPayload(json),
        amount: parseFloat(String(row.grand_total ?? 0)) || 0,
        paymentStatus: status,
        customerName: row.customer_name != null ? String(row.customer_name) : null,
        customerEmail: row.customer_email != null ? String(row.customer_email) : null,
        createdAt: row.created_at != null ? String(row.created_at) : null,
        paidAt: row.paid_at != null ? String(row.paid_at) : null,
        paymentFee:
          row.payment_fee != null && Number.isFinite(Number(row.payment_fee))
            ? Number(row.payment_fee)
            : null,
        reviewUrl: getPayLinkUrl(orderId, { token }),
        canDisable: false,
        canCopy: false,
        linkStatus: status === 'PAID' ? 'paid' : 'active',
      });
    }
  }

  rows.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
  return { rows: rows.slice(0, limit) };
}
