'use client';

import { useEffect, useRef, useState } from 'react';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';
import { compressReceiptImageForUpload } from '@/lib/receiptImageCompress';
import { isReceiptImageFile } from '@/lib/isReceiptImageFile';
import { MAX_RECEIPT_UPLOAD_BYTES } from '@/lib/receiptUploadLimits';

interface ItemHistoryPhotoActionsProps {
  orderId: string;
  itemId: string;
  title: string;
  hasPhoto: boolean;
  onPhotoChange?: () => void;
}

export function ItemHistoryPhotoActions({
  orderId,
  itemId,
  title,
  hasPhoto,
  onPhotoChange,
}: ItemHistoryPhotoActionsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attached, setAttached] = useState(hasPhoto);

  useEffect(() => {
    setAttached(hasPhoto);
  }, [hasPhoto]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
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
        `/api/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/purchase-photo`,
        { method: 'POST', body: formData }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Upload failed');
        return;
      }
      setAttached(true);
      onPhotoChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!attached) return;
    if (!confirmDeleteAction('Remove this purchase photo?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/purchase-photo`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Remove failed');
        return;
      }
      setAttached(false);
      onPhotoChange?.();
    } catch {
      setError('Remove failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-cogs-photo-actions">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={(e) => {
          void handleFile(e);
        }}
        style={{ display: 'none' }}
        aria-label={`Add purchase photo for ${title}`}
      />
      <button
        type="button"
        className="admin-btn admin-btn-sm admin-btn-outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? '…' : attached ? 'Replace photo' : 'Add photo'}
      </button>
      {attached ? (
        <button
          type="button"
          className="admin-btn admin-btn-sm admin-btn-outline admin-btn-danger"
          disabled={busy}
          onClick={() => {
            void handleRemove();
          }}
        >
          Remove
        </button>
      ) : null}
      {error ? <p className="admin-costs-error">{error}</p> : null}
    </div>
  );
}
