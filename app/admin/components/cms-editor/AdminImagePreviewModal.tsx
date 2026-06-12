'use client';

import { AdminCmsModal } from './AdminCmsModal';

type Props = {
  open: boolean;
  src: string;
  title?: string;
  alt?: string;
  onClose: () => void;
};

export function AdminImagePreviewModal({
  open,
  src,
  title = 'Image preview',
  alt = '',
  onClose,
}: Props) {
  return (
    <AdminCmsModal open={open} title={title} onClose={onClose}>
      <div className="admin-cms-image-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt || title} className="admin-cms-image-preview-img" />
      </div>
    </AdminCmsModal>
  );
}
