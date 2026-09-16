'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';
import { compressReceiptImageForUpload } from '@/lib/receiptImageCompress';
import { isReceiptImageFile } from '@/lib/isReceiptImageFile';
import { MAX_RECEIPT_UPLOAD_BYTES } from '@/lib/receiptUploadLimits';

interface SoldHistorySinglePhotoCardProps {
  orderId: string;
  itemId: string;
  photoKind: 'purchase' | 'delivery';
  label: string;
  src: string | null;
  canEdit: boolean;
  onOpenLightbox: (src: string) => void;
}

/**
 * A single-photo slot (delivered bouquet / purchase photo) styled to match the
 * expense receipt cards: thumbnail with a "×" overlay to remove, "Add photo" /
 * "Replace photo" button below. Writes through the same order-item photo
 * routes `ItemHistoryPhotoActions` uses, just with this card's own layout.
 */
export function SoldHistorySinglePhotoCard({
  orderId,
  itemId,
  photoKind,
  label,
  src,
  canEdit,
  onOpenLightbox,
}: SoldHistorySinglePhotoCardProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endpoint = photoKind === 'delivery' ? 'delivery-photo' : 'purchase-photo';

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setError(null);
    if (!isReceiptImageFile(file)) {
      setError('Only image files are allowed.');
      return;
    }

    setBusy(true);
    try {
      const fileToUpload = await compressReceiptImageForUpload(file, MAX_RECEIPT_UPLOAD_BYTES);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/${endpoint}`,
        { method: 'POST', body: formData }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Upload failed');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!confirmDeleteAction(`Remove this ${label.toLowerCase()}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/${endpoint}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Remove failed');
        return;
      }
      router.refresh();
    } catch {
      setError('Remove failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-sold-history-sale-image-card">
      <span className="admin-hint">{label}</span>

      {src ? (
        <div className="admin-sold-history-receipt-thumb-wrap">
          <button
            type="button"
            className="admin-sold-history-gallery-thumb admin-sold-history-sale-thumb"
            onClick={() => onOpenLightbox(src)}
            aria-label={`View ${label.toLowerCase()}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- signed ops photo */}
            <img src={src} alt="" />
          </button>
          {canEdit ? (
            <button
              type="button"
              className="admin-sold-history-receipt-delete"
              onClick={handleRemove}
              disabled={busy}
              aria-label={`Remove ${label.toLowerCase()}`}
              title="Remove"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden>
                close
              </span>
            </button>
          ) : null}
        </div>
      ) : (
        <p className="admin-hint">No {label.toLowerCase()} yet.</p>
      )}

      {canEdit ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFile}
            disabled={busy}
            style={{ display: 'none' }}
            aria-label={`Add ${label.toLowerCase()}`}
          />
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? 'Uploading…' : src ? 'Replace photo' : 'Add photo'}
          </button>
        </>
      ) : null}

      {error ? (
        <p className="admin-error" style={{ fontSize: '0.75rem', marginTop: 4 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
