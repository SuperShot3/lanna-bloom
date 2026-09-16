'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AdminImageLightbox } from '@/app/admin/components/AdminImageLightbox';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import { formatThb } from '@/lib/costsUtils';
import type { SoldProductHistorySaleRow } from '@/lib/admin/soldProductsHistoryTypes';
import { SoldHistoryExpenseReceiptCard } from './SoldHistoryExpenseReceiptCard';
import { SoldHistorySinglePhotoCard } from './SoldHistorySinglePhotoCard';

interface SoldHistorySaleRowProps {
  sale: SoldProductHistorySaleRow;
  canEdit: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function SoldHistorySaleRow({ sale, canEdit }: SoldHistorySaleRowProps) {
  const [open, setOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  return (
    <>
      <tr>
        <td>
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? 'Hide' : 'Images'}
          </button>
        </td>
        <td className="admin-hint">{formatDate(sale.paid_at)}</td>
        <td className="admin-expenses-amount">{formatThb(sale.price)}</td>
        <td className="admin-expenses-amount">{formatThb(sale.cost)}</td>
        <td style={{ fontWeight: 600 }}>{sale.shop_name ?? '—'}</td>
        <td>{sale.recipient_name ?? '—'}</td>
        <td>
          <Link href={`/admin/orders/${encodeURIComponent(sale.order_id)}`} className="admin-link">
            {sale.order_id}
          </Link>
        </td>
      </tr>
      <tr>
        <td colSpan={7} style={{ padding: 0, border: open ? undefined : 'none' }}>
          <OverlayReveal open={open}>
            <div className="admin-sold-history-sale-images">
              <div className="admin-sold-history-sale-image-card">
                <span className="admin-hint">Product photo</span>
                {sale.image_snapshot ? (
                  <button
                    type="button"
                    className="admin-sold-history-gallery-thumb admin-sold-history-sale-thumb"
                    onClick={() => setLightboxSrc(sale.image_snapshot)}
                    aria-label="View product photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- historical snapshot */}
                    <img src={sale.image_snapshot} alt="" />
                  </button>
                ) : (
                  <p className="admin-hint">No product photo recorded for this sale.</p>
                )}
              </div>

              <SoldHistorySinglePhotoCard
                orderId={sale.order_id}
                itemId={sale.item_id}
                photoKind="purchase"
                label="Purchase photo"
                src={sale.purchase_photo_url}
                canEdit={canEdit}
                onOpenLightbox={setLightboxSrc}
              />

              {sale.expenses.map((expense) => (
                <SoldHistoryExpenseReceiptCard
                  key={expense.expense_id}
                  expense={expense}
                  canEdit={canEdit}
                  onOpenLightbox={setLightboxSrc}
                />
              ))}

              {sale.expenses.length === 0 ? (
                <div className="admin-sold-history-sale-image-card">
                  <span className="admin-hint">Receipts</span>
                  <p className="admin-hint">
                    No expenses linked to this order yet.{' '}
                    <Link href={`/admin/orders/${encodeURIComponent(sale.order_id)}`} className="admin-link">
                      Add in Costs &amp; profit
                    </Link>
                  </p>
                </div>
              ) : null}
            </div>
          </OverlayReveal>
        </td>
      </tr>

      {lightboxSrc ? (
        <AdminImageLightbox src={lightboxSrc} alt="" onClose={() => setLightboxSrc(null)} />
      ) : null}
    </>
  );
}
