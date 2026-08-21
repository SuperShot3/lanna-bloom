'use client';

import { useState } from 'react';
import { AdminImageLightbox } from '@/app/admin/components/AdminImageLightbox';

interface ItemCogsPhotoProps {
  title: string;
  catalogImageUrl?: string | null;
}

export function ItemCogsPhoto({ title, catalogImageUrl }: ItemCogsPhotoProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const catalog = catalogImageUrl?.trim() || null;

  return (
    <div className="admin-cogs-photo">
      {catalog ? (
        <button
          type="button"
          className="admin-cogs-photo-thumb"
          onClick={() => setLightboxSrc(catalog)}
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
      {lightboxSrc ? (
        <AdminImageLightbox src={lightboxSrc} alt={title} onClose={() => setLightboxSrc(null)} />
      ) : null}
    </div>
  );
}
