'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface AdminImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function AdminImageLightbox({ src, alt, onClose }: AdminImageLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="admin-image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button type="button" className="admin-image-lightbox-close" onClick={onClose}>
        Close
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs and catalog snapshots */}
      <img
        src={src}
        alt={alt}
        className="admin-image-lightbox-image"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
