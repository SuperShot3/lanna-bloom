'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';
import { compressReceiptImageForUpload } from '@/lib/receiptImageCompress';
import { isReceiptImageFile } from '@/lib/isReceiptImageFile';
import { MAX_RECEIPT_IMAGES_PER_EXPENSE, MAX_RECEIPT_UPLOAD_BYTES } from '@/lib/receiptUploadLimits';
import { formatThb } from '@/lib/costsUtils';
import type { SoldSaleExpense } from '@/lib/admin/soldProductsHistoryTypes';

interface SoldHistoryExpenseReceiptCardProps {
  expense: SoldSaleExpense;
  canEdit: boolean;
  onOpenLightbox: (src: string) => void;
}

/**
 * Add/view/delete receipt photos for one expense (Flowers/COGS, Delivery, …)
 * linked to this order — writes through the same `expenses/{id}/receipts`
 * endpoint the order's Costs & profit page uses, so both stay in sync.
 */
export function SoldHistoryExpenseReceiptCard({
  expense,
  canEdit,
  onOpenLightbox,
}: SoldHistoryExpenseReceiptCardProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atLimit = expense.images.length >= MAX_RECEIPT_IMAGES_PER_EXPENSE;

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
        `/api/admin/expenses/${encodeURIComponent(expense.expense_id)}/receipts`,
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

  const handleDelete = async (imageId: string) => {
    if (!confirmDeleteAction('Remove this receipt image?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/expenses/${encodeURIComponent(expense.expense_id)}/receipts/${encodeURIComponent(imageId)}`,
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
      <span className="admin-hint">
        Receipt · {expense.category}
        {expense.amount != null ? ` (${formatThb(expense.amount)})` : ''}
      </span>

      {expense.images.length > 0 ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {expense.images.map((image) => (
            <div key={image.id} className="admin-sold-history-receipt-thumb-wrap">
              <button
                type="button"
                className="admin-sold-history-gallery-thumb admin-sold-history-sale-thumb"
                onClick={() => onOpenLightbox(image.url)}
                aria-label={`View ${expense.category} receipt`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- signed expense receipt */}
                <img src={image.url} alt="" />
              </button>
              {canEdit ? (
                <button
                  type="button"
                  className="admin-sold-history-receipt-delete"
                  onClick={() => handleDelete(image.id)}
                  disabled={busy}
                  aria-label="Delete receipt image"
                  title="Delete"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden>
                    close
                  </span>
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="admin-hint">No receipt image yet.</p>
      )}

      {canEdit ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFile}
            disabled={busy || atLimit}
            style={{ display: 'none' }}
            aria-label={`Add receipt photo for ${expense.category}`}
          />
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy || atLimit}
          >
            {busy ? 'Uploading…' : atLimit ? 'Max reached' : expense.images.length ? 'Add another' : 'Add photo'}
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
