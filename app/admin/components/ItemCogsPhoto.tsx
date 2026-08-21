'use client';

import { useRef, useState } from 'react';
import { AdminImageLightbox } from '@/app/admin/components/AdminImageLightbox';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';
import { compressReceiptImageForUpload } from '@/lib/receiptImageCompress';
import { isReceiptImageFile } from '@/lib/isReceiptImageFile';
import { MAX_RECEIPT_UPLOAD_BYTES } from '@/lib/receiptUploadLimits';

interface ItemCogsPhotoProps {
  orderId: string;
  itemId?: string | number | null;
  title: string;
  catalogImageUrl?: string | null;
  purchasePhotoPath?: string | null;
  canEdit: boolean;
  onPhotoChange?: () => void;
}

export function ItemCogsPhoto({
  orderId,
  itemId,
  title,
  catalogImageUrl,
  purchasePhotoPath,
  canEdit,
  onPhotoChange,
}: ItemCogsPhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(purchasePhotoPath?.trim() || null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const catalog = catalogImageUrl?.trim() || null;
  const id = itemId != null ? String(itemId) : '';
  const canUpload = canEdit && Boolean(id);

  const openLarge = () => {
    if (!catalog) return;
    setLightboxSrc(catalog);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (inputRef.current) inputRef.current.value = '';
    if (!file || !id) return;
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
        `/api/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(id)}/purchase-photo`,
        { method: 'POST', body: formData }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Upload failed');
        return;
      }
      if (typeof data.path === 'string') setPath(data.path);
      onPhotoChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!id || !path) return;
    if (!confirmDeleteAction('Remove this purchase photo?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(id)}/purchase-photo`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Remove failed');
        return;
      }
      setPath(null);
      onPhotoChange?.();
    } catch {
      setError('Remove failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-cogs-photo">
      {catalog ? (
        <button
          type="button"
          className="admin-cogs-photo-thumb"
          onClick={openLarge}
          aria-label={`View catalog photo of ${title}`}
          title="View catalog image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- catalog snapshots */}
          <img src={catalog} alt="" />
        </button>
      ) : (
        <div className="admin-cogs-photo-empty" aria-hidden>
          No photo
        </div>
      )}
      {canUpload ? (
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
            {busy ? '…' : path ? 'Replace photo' : 'Add photo'}
          </button>
          {path ? (
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
        </div>
      ) : null}
      {path ? <p className="admin-cogs-photo-status">Photo saved for history</p> : null}
      {error ? <p className="admin-costs-error">{error}</p> : null}
      {lightboxSrc ? (
        <AdminImageLightbox src={lightboxSrc} alt={title} onClose={() => setLightboxSrc(null)} />
      ) : null}
    </div>
  );
}
