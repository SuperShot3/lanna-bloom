import Link from 'next/link';
import type { SupabaseOrderRow, SupplierOrderRequestRow } from '@/lib/supabase/adminQueries';
import {
  buildSupplierRequestUrl,
  supplierStatusLabelEnglish,
} from '@/lib/supplierRequests';
import { formatShopDateTime } from '@/lib/shopTime';

interface SupplierRequestSummaryCardProps {
  order: SupabaseOrderRow;
  latestRequest: SupplierOrderRequestRow | null;
  canManage: boolean;
}

function formatAmount(n: number | null | undefined): string {
  if (n == null) return 'Not set';
  return `฿${Number(n).toLocaleString()}`;
}

export function SupplierRequestSummaryCard({
  order,
  latestRequest,
  canManage,
}: SupplierRequestSummaryCardProps) {
  const confirmedName = order.confirmed_supplier_shop_name?.trim();
  const managementHref = `/admin/orders/${encodeURIComponent(order.order_id)}/supplier-requests`;

  return (
    <section className="admin-section admin-supplier-summary">
      <div className="admin-summary-card-header">
        <div>
          <h2 className="admin-section-title">Supplier Request</h2>
          <p className="admin-hint">Create private shop links and approve the supplier after they respond.</p>
        </div>
        <Link href={managementHref} className="admin-btn admin-btn-outline">
          Manage supplier requests
        </Link>
      </div>

      {confirmedName ? (
        <div className="admin-supplier-confirmed">
          <span className="admin-badge admin-badge-paid">Supplier confirmed</span>
          <p>
            <strong>{confirmedName}</strong>
            {order.confirmed_supplier_price != null ? ` · ${formatAmount(order.confirmed_supplier_price)}` : ''}
            {order.confirmed_supplier_ready_time ? ` · Ready ${order.confirmed_supplier_ready_time}` : ''}
          </p>
          {order.confirmed_supplier_confirmed_at && (
            <p className="admin-muted">
              Confirmed {formatShopDateTime(order.confirmed_supplier_confirmed_at)}
            </p>
          )}
        </div>
      ) : (
        <p className="admin-muted">No supplier has been confirmed for this order yet.</p>
      )}

      {latestRequest ? (
        <div className="admin-supplier-latest">
          <p>
            <strong>Latest request:</strong> {latestRequest.shop_name_snapshot} ·{' '}
            <span className="admin-badge">{supplierStatusLabelEnglish(latestRequest.status)}</span>
          </p>
          <p className="admin-muted">
            Created {formatShopDateTime(latestRequest.created_at)} · Expires{' '}
            {formatShopDateTime(latestRequest.expires_at)}
          </p>
          {canManage && (
            <p className="admin-muted admin-supplier-link-preview">
              Link: {buildSupplierRequestUrl(latestRequest.public_token)}
            </p>
          )}
        </div>
      ) : (
        <p className="admin-empty">No supplier requests yet.</p>
      )}
    </section>
  );
}
