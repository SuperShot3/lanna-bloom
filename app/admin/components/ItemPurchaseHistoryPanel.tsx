'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminImageLightbox } from '@/app/admin/components/AdminImageLightbox';
import { ItemHistoryPhotoActions } from '@/app/admin/components/ItemHistoryPhotoActions';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import { formatThb } from '@/lib/costsUtils';
import type {
  ItemPurchaseHistoryResponse,
  ItemPurchaseHistoryRow,
} from '@/lib/admin/itemPurchaseHistoryTypes';

function formatHistoryDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

interface ItemPurchaseHistoryPanelProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  data: ItemPurchaseHistoryResponse | null;
  canApply: boolean;
  onApply: (row: ItemPurchaseHistoryRow) => void;
  currentOrderId: string;
  currentItemId?: string | null;
  currentSize?: string | null;
  canEditPhoto?: boolean;
  onPhotoChange?: () => void;
}

function currentOrderStub(orderId: string, size: string | null): ItemPurchaseHistoryRow {
  return {
    order_id: orderId,
    paid_at: null,
    cost: 0,
    size,
    shop_id: null,
    shop_name: null,
    same_size: true,
    is_current_order: true,
    purchase_photo_url: null,
  };
}

export function ItemPurchaseHistoryPanel({
  open,
  loading,
  error,
  data,
  canApply,
  onApply,
  currentOrderId,
  currentItemId,
  currentSize,
  canEditPhoto = false,
  onPhotoChange,
}: ItemPurchaseHistoryPanelProps) {
  const summary = data?.summary;
  const apiRows = data?.rows ?? [];
  const rows = useMemo(() => {
    if (apiRows.some((row) => row.is_current_order)) return apiRows;
    if (!canEditPhoto) return apiRows;
    return [currentOrderStub(currentOrderId, currentSize?.trim() || null), ...apiRows];
  }, [apiRows, canEditPhoto, currentOrderId, currentSize]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const photoItemId = currentItemId?.trim() || '';
  const canUpload = canEditPhoto && Boolean(photoItemId);

  return (
    <OverlayReveal open={open} className="admin-costs-history-reveal">
      <div className="admin-costs-history-panel">
        {loading ? <p className="admin-hint">Loading purchase history…</p> : null}
        {error ? <p className="admin-costs-error">{error}</p> : null}
        {!loading && !error && summary && summary.count > 0 ? (
          <p className="admin-hint" style={{ marginBottom: 8 }}>
            Last {formatThb(summary.last_cost)}
            {summary.last_shop_name ? ` at ${summary.last_shop_name}` : ''}
            {' · '}
            Avg {formatThb(summary.average)}
            {' · '}
            Range {formatThb(summary.min)}–{formatThb(summary.max)}
            {' · '}
            {summary.count} {summary.count === 1 ? 'purchase' : 'purchases'}
          </p>
        ) : null}
        {!loading && !error && apiRows.length === 0 && !canUpload ? (
          <p className="admin-hint">No purchase costs for this item yet. Save a line cost to add this order.</p>
        ) : null}
        {!loading && !error && apiRows.length === 0 && canUpload ? (
          <p className="admin-hint" style={{ marginBottom: 8 }}>
            Save a line cost to record this purchase. You can add a photo on this order’s row.
          </p>
        ) : null}
        {rows.length > 0 ? (
          <div className="admin-expenses-table-wrap">
            <table className="admin-expenses-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Date</th>
                  <th className="admin-expenses-col-amount">Cost</th>
                  <th>Shop</th>
                  <th>Size</th>
                  <th>Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const showCost = row.is_current_order && row.cost <= 0 ? null : row.cost;
                  return (
                    <tr key={`${row.order_id}-${row.size ?? ''}-${row.cost}-${idx}`}>
                      <td>
                        <div className="admin-costs-history-photo-cell">
                          {row.purchase_photo_url ? (
                            <button
                              type="button"
                              className="admin-cogs-photo-thumb admin-costs-history-photo"
                              onClick={() => setLightboxSrc(row.purchase_photo_url)}
                              aria-label="View purchase photo"
                              title="View large image"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- signed ops photo */}
                              <img src={row.purchase_photo_url} alt="" />
                            </button>
                          ) : (
                            <span className="admin-hint">—</span>
                          )}
                          {row.is_current_order && canUpload ? (
                            <ItemHistoryPhotoActions
                              orderId={currentOrderId}
                              itemId={photoItemId}
                              title="this order"
                              hasPhoto={Boolean(row.purchase_photo_url)}
                              onPhotoChange={onPhotoChange}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td>{formatHistoryDate(row.paid_at)}</td>
                      <td className="admin-expenses-amount">{formatThb(showCost)}</td>
                      <td>{row.shop_name ?? '—'}</td>
                      <td>
                        {row.size ?? '—'}
                        {!row.same_size ? (
                          <span className="admin-hint"> · other size</span>
                        ) : null}
                      </td>
                      <td>
                        {row.is_current_order ? (
                          <span>This order</span>
                        ) : (
                          <Link
                            href={`/admin/orders/${encodeURIComponent(row.order_id)}`}
                            className="admin-link"
                          >
                            {row.order_id}
                          </Link>
                        )}
                      </td>
                      <td>
                        {canApply && !row.is_current_order ? (
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-outline"
                            onClick={() => onApply(row)}
                          >
                            Use
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {lightboxSrc ? (
          <AdminImageLightbox
            src={lightboxSrc}
            alt="Purchase photo"
            onClose={() => setLightboxSrc(null)}
          />
        ) : null}
      </div>
    </OverlayReveal>
  );
}
