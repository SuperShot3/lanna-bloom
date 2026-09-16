'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminImageLightbox } from '@/app/admin/components/AdminImageLightbox';
import { ItemHistoryPhotoActions } from '@/app/admin/components/ItemHistoryPhotoActions';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import { formatThb } from '@/lib/costsUtils';
import type { SoldProductHistorySaleRow } from '@/lib/admin/soldProductsHistoryTypes';

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
  const router = useRouter();
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
        <td>{formatDate(sale.paid_at)}</td>
        <td className="admin-expenses-amount">{formatThb(sale.price)}</td>
        <td className="admin-expenses-amount">{formatThb(sale.cost)}</td>
        <td>{sale.shop_name ?? '—'}</td>
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

              <div className="admin-sold-history-sale-image-card">
                <span className="admin-hint">Delivered bouquet</span>
                {sale.delivery_photo_url ? (
                  <button
                    type="button"
                    className="admin-sold-history-gallery-thumb admin-sold-history-sale-thumb"
                    onClick={() => setLightboxSrc(sale.delivery_photo_url)}
                    aria-label="View delivered bouquet photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed ops photo */}
                    <img src={sale.delivery_photo_url} alt="" />
                  </button>
                ) : (
                  <p className="admin-hint">No photo added yet.</p>
                )}
                {canEdit ? (
                  <ItemHistoryPhotoActions
                    orderId={sale.order_id}
                    itemId={sale.item_id}
                    title="the delivered bouquet"
                    hasPhoto={Boolean(sale.delivery_photo_path)}
                    photoKind="delivery"
                    onPhotoChange={() => router.refresh()}
                  />
                ) : null}
              </div>

              <div className="admin-sold-history-sale-image-card">
                <span className="admin-hint">Receipt</span>
                {sale.purchase_photo_url ? (
                  <button
                    type="button"
                    className="admin-sold-history-gallery-thumb admin-sold-history-sale-thumb"
                    onClick={() => setLightboxSrc(sale.purchase_photo_url)}
                    aria-label="View receipt photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed ops photo */}
                    <img src={sale.purchase_photo_url} alt="" />
                  </button>
                ) : (
                  <p className="admin-hint">No receipt photo yet.</p>
                )}
                {canEdit ? (
                  <ItemHistoryPhotoActions
                    orderId={sale.order_id}
                    itemId={sale.item_id}
                    title="this sale"
                    hasPhoto={Boolean(sale.purchase_photo_path)}
                    photoKind="purchase"
                    onPhotoChange={() => router.refresh()}
                  />
                ) : null}
              </div>
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
