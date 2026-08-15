import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { ADMIN_PAY_LINK_SOURCE } from '@/lib/payLinks/adminPayLink';
import { getPayLinkUrl } from '@/lib/orders';

export type AdminPayLinkListRow = {
  orderId: string;
  description: string;
  amount: number;
  paymentStatus: string;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string | null;
  paidAt: string | null;
  paymentFee: number | null;
  reviewUrl: string;
};

function descriptionFromJson(json: Record<string, unknown> | null | undefined): string {
  const items = json?.items;
  if (Array.isArray(items) && items[0] && typeof items[0] === 'object') {
    const title = (items[0] as { bouquetTitle?: unknown }).bouquetTitle;
    if (typeof title === 'string' && title.trim()) return title.trim();
  }
  return 'Pay link';
}

export async function listAdminPayLinks(opts?: {
  paymentStatus?: 'PAID' | 'NOT_PAID' | 'all';
  limit?: number;
}): Promise<{ rows: AdminPayLinkListRow[]; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { rows: [], error: 'Supabase not configured' };

  const limit = Math.min(200, Math.max(1, opts?.limit ?? 80));
  let query = supabase
    .from('orders')
    .select(
      'order_id, public_token, payment_status, grand_total, customer_name, customer_email, created_at, paid_at, payment_fee, order_json'
    )
    .contains('order_json', { orderSource: ADMIN_PAY_LINK_SOURCE })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts?.paymentStatus && opts.paymentStatus !== 'all') {
    query = query.eq('payment_status', opts.paymentStatus);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[listAdminPayLinks]', error.message);
    return { rows: [], error: error.message };
  }

  const rows: AdminPayLinkListRow[] = (data ?? []).map((row) => {
    const json = (row.order_json ?? null) as Record<string, unknown> | null;
    const token = typeof row.public_token === 'string' ? row.public_token : null;
    return {
      orderId: String(row.order_id),
      description: descriptionFromJson(json),
      amount: parseFloat(String(row.grand_total ?? 0)) || 0,
      paymentStatus: String(row.payment_status ?? 'NOT_PAID').toUpperCase(),
      customerName: row.customer_name != null ? String(row.customer_name) : null,
      customerEmail: row.customer_email != null ? String(row.customer_email) : null,
      createdAt: row.created_at != null ? String(row.created_at) : null,
      paidAt: row.paid_at != null ? String(row.paid_at) : null,
      paymentFee:
        row.payment_fee != null && Number.isFinite(Number(row.payment_fee))
          ? Number(row.payment_fee)
          : null,
      reviewUrl: getPayLinkUrl(String(row.order_id), { token }),
    };
  });

  return { rows };
}
