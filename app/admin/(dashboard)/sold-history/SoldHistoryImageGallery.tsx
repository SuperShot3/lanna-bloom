'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminImageLightbox } from '@/app/admin/components/AdminImageLightbox';
import type { CatalogStoredImage } from '@/lib/catalog/types';
import type { SoldProductEntityType } from '@/lib/admin/soldProductsHistoryTypes';

interface SoldHistoryImageGalleryProps {
  entityType: SoldProductEntityType;
  entityId: string;
  images: CatalogStoredImage[];
  canEdit: boolean;
}

export function SoldHistoryImageGallery({
  entityType,
  entityId,
  images,
  canEdit,
}: SoldHistoryImageGalleryProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch(
        `/api/admin/products/sold-history/${entityType}/${encodeURIComponent(entityId)}/images`,
        { method: 'POST', body: formData }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Failed to upload image');
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-sold-history-gallery">
      <div className="admin-summary-card-header" style={{ marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>Images</h4>
        {canEdit ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="admin-btn admin-btn-outline admin-btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Add image'}
            </button>
          </>
        ) : null}
      </div>

      {images.length === 0 ? (
        <p className="admin-hint">No reference images yet.</p>
      ) : (
        <div className="admin-sold-history-gallery-grid">
          {images.map((image) => (
            <button
              key={image.storage_path}
              type="button"
              className="admin-sold-history-gallery-thumb"
              onClick={() => image.public_url && setLightboxSrc(image.public_url)}
              aria-label="View image"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- catalog gallery thumbnail */}
              <img src={image.public_url} alt={image.alt ?? ''} />
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="admin-error" style={{ marginTop: 8, marginBottom: 0 }}>
          {error}
        </p>
      ) : null}

      {lightboxSrc ? (
        <AdminImageLightbox src={lightboxSrc} alt="" onClose={() => setLightboxSrc(null)} />
      ) : null}
    </div>
  );
}
