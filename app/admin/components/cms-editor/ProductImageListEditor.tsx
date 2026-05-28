'use client';

import { useMemo, useRef, useState } from 'react';
import type { AdminCatalogProductImage } from '@/lib/catalog/types';
import { catalogImageFormatLabel, imageLabelFromPath } from '@/lib/catalogAdminFieldOptions';
import { AdminRowMenu, type AdminRowMenuItem } from './AdminRowMenu';
import { AdminSortableList } from './AdminSortableList';
import { AdminSortableRow } from './AdminSortableRow';
import { AdminImageAltModal } from './AdminImageAltModal';
import { AdminImagePreviewModal } from './AdminImagePreviewModal';
import { AdminImageCropModal } from './AdminImageCropModal';

type Props = {
  images: AdminCatalogProductImage[];
  variantKey?: string | null;
  disabled?: boolean;
  loadingKey?: string | null;
  /** When true, every upload/replace runs through the interactive crop modal first. */
  enableCrop?: boolean;
  onReorder: (orderedIds: string[]) => void | Promise<void>;
  onUpload: (file: File) => void | Promise<void>;
  onSaveAlt: (image: AdminCatalogProductImage) => void | Promise<void>;
  onReplace: (imageId: string, file: File) => void | Promise<void>;
  onGenerateAi?: (imageId: string, file: File) => void | Promise<void>;
  onRemove: (imageId: string) => void | Promise<void>;
};

type PendingCrop =
  | { mode: 'upload'; file: File }
  | { mode: 'replace'; imageId: string; file: File };

export function ProductImageListEditor({
  images,
  variantKey,
  disabled,
  loadingKey,
  enableCrop,
  onReorder,
  onUpload,
  onSaveAlt,
  onReplace,
  onGenerateAi,
  onRemove,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceImageId, setReplaceImageId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAltEn, setEditAltEn] = useState('');
  const [editAltTh, setEditAltTh] = useState('');
  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);
  const [previewItem, setPreviewItem] = useState<{ url: string; title: string } | null>(null);

  const scoped = useMemo(() => {
    if (variantKey) {
      return images.filter((img) => img.variantKey === variantKey);
    }
    return images.filter((img) => !img.variantKey);
  }, [images, variantKey]);

  const ids = scoped.map((img) => img.id);

  function openEdit(image: AdminCatalogProductImage) {
    setEditingId(image.id);
    setEditAltEn(image.altEn);
    setEditAltTh(image.altTh);
  }

  function openPreview(image: AdminCatalogProductImage) {
    setPreviewItem({
      url: image.url,
      title: image.altEn?.trim() || imageLabelFromPath(image.storagePath),
    });
  }

  function handleUploadFile(file: File) {
    if (enableCrop) {
      setPendingCrop({ mode: 'upload', file });
      return;
    }
    void onUpload(file);
  }

  function handleReplaceFile(imageId: string, file: File) {
    if (enableCrop) {
      setPendingCrop({ mode: 'replace', imageId, file });
      return;
    }
    void onReplace(imageId, file);
  }

  function menuItems(image: AdminCatalogProductImage, index: number): AdminRowMenuItem[] {
    const items: AdminRowMenuItem[] = [
      {
        id: 'preview',
        label: 'Preview image',
        onClick: () => openPreview(image),
      },
      {
        id: 'edit',
        label: 'Edit image details',
        onClick: () => openEdit(image),
      },
      {
        id: 'replace',
        label: 'Replace image',
        onClick: () => {
          setReplaceImageId(image.id);
          replaceInputRef.current?.click();
        },
      },
    ];
    if (onGenerateAi) {
      items.push({
        id: 'ai',
        label: 'Generate AI image',
        onClick: () => {
          setReplaceImageId(image.id);
          replaceInputRef.current?.click();
        },
      });
    }
    items.push({
      id: 'remove',
      label: 'Remove image',
      destructive: true,
      onClick: () => onRemove(image.id),
    });
    void index;
    return items;
  }

  return (
    <div className="admin-cms-image-list">
      {scoped.length === 0 ? (
        <p className="admin-cms-empty-hint">No images yet.</p>
      ) : (
        <AdminSortableList
          ids={ids}
          onReorder={onReorder}
          overlayTitle="Moving image…"
        >
          {scoped.map((image, index) => (
            <AdminSortableRow
              key={image.id}
              id={image.id}
              title={image.altEn?.trim() || imageLabelFromPath(image.storagePath)}
              onIconClick={() => openPreview(image)}
              icon={
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt="" className="admin-cms-image-thumb" />
              }
              badge={
                <span className="admin-cms-image-badges">
                  <span
                    className="admin-cms-badge-format"
                    title={`Format: ${catalogImageFormatLabel(image)}`}
                  >
                    {catalogImageFormatLabel(image)}
                  </span>
                  {index === 0 ? <span className="admin-cms-badge-main">Main image</span> : null}
                </span>
              }
              menu={<AdminRowMenu items={menuItems(image, index)} ariaLabel="Image actions" />}
            />
          ))}
        </AdminSortableList>
      )}

      <button
        type="button"
        className="admin-cms-btn admin-cms-btn-outline admin-cms-btn-block"
        disabled={disabled || !!loadingKey}
        onClick={() => fileInputRef.current?.click()}
      >
        + Add image
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="admin-cms-sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadFile(file);
          e.target.value = '';
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="admin-cms-sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replaceImageId) {
            handleReplaceFile(replaceImageId, file);
          }
          setReplaceImageId(null);
          e.target.value = '';
        }}
      />

      <AdminImagePreviewModal
        open={previewItem !== null}
        src={previewItem?.url ?? ''}
        title={previewItem?.title ?? 'Image preview'}
        alt={previewItem?.title ?? ''}
        onClose={() => setPreviewItem(null)}
      />

      <AdminImageAltModal
        open={editingId !== null}
        title="Edit image details"
        altEn={editAltEn}
        altTh={editAltTh}
        onAltEnChange={setEditAltEn}
        onAltThChange={setEditAltTh}
        onSave={() => {
          const image = scoped.find((i) => i.id === editingId);
          if (!image) return;
          void onSaveAlt({ ...image, altEn: editAltEn, altTh: editAltTh });
          setEditingId(null);
        }}
        onClose={() => setEditingId(null)}
        saving={!!loadingKey}
      />

      <AdminImageCropModal
        open={Boolean(pendingCrop)}
        file={pendingCrop?.file ?? null}
        title={pendingCrop?.mode === 'replace' ? 'Crop replacement image' : 'Crop new image'}
        onCancel={() => setPendingCrop(null)}
        onSkip={() => {
          const next = pendingCrop;
          setPendingCrop(null);
          if (!next) return;
          if (next.mode === 'upload') void onUpload(next.file);
          else void onReplace(next.imageId, next.file);
        }}
        onApply={({ file }) => {
          const next = pendingCrop;
          setPendingCrop(null);
          if (!next) return;
          if (next.mode === 'upload') void onUpload(file);
          else void onReplace(next.imageId, file);
        }}
      />
    </div>
  );
}
