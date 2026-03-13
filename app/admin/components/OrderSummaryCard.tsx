import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';

interface OrderSummaryCardProps {
  order: SupabaseOrderRow;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatAmount(n: number | null | undefined): string {
  if (n == null) return '—';
  return `฿${Number(n).toLocaleString()}`;
}

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  return (
    <section className="admin-section admin-summary-card">
      <h2 className="admin-section-title">Order summary</h2>
      <div className="admin-summary-grid">
        <div>
          <strong>Order ID</strong>
          <p>{order.order_id}</p>
        </div>
        <div>
          <strong>Created</strong>
          <p>{formatDate(order.created_at)}</p>
        </div>
        <div>
          <strong>Customer</strong>
          <p>{order.customer_name ?? '—'}</p>
          {order.customer_email && (
            <p className="admin-muted">{order.customer_email}</p>
          )}
          <p className="admin-muted">{order.phone ?? ''}</p>
        </div>
        <div>
          <strong>Items total</strong>
          <p>{formatAmount(order.items_total)}</p>
        </div>
        <div>
          <strong>Delivery fee</strong>
          <p>{formatAmount(order.delivery_fee)}</p>
        </div>
        {(order.referral_discount != null && order.referral_discount > 0) && (
          <div>
            <strong>Discount</strong>
            <p className="admin-discount">-{formatAmount(order.referral_discount)}</p>
          </div>
        )}
        <div>
          <strong>Grand total</strong>
          <p className="admin-total">{formatAmount(order.grand_total)}</p>
        </div>
      </div>
    </section>
  );
}
