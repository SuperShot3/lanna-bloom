'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent } from 'react';
import { AdminCmsCollapsibleSection } from '@/app/admin/components/cms-editor/AdminCmsCollapsibleSection';
import { AdminCmsSection } from '@/app/admin/components/cms-editor/AdminCmsSection';
import { AdminImageAltModal } from '@/app/admin/components/cms-editor/AdminImageAltModal';
import { AdminImageCropModal } from '@/app/admin/components/cms-editor/AdminImageCropModal';
import { AdminImagePreviewModal } from '@/app/admin/components/cms-editor/AdminImagePreviewModal';
import { AdminImageProcessingBanner } from '@/app/admin/components/cms-editor/AdminImageProcessingBanner';
import { AdminRowMenu } from '@/app/admin/components/cms-editor/AdminRowMenu';
import { AdminSortableList } from '@/app/admin/components/cms-editor/AdminSortableList';
import { AdminSortableRow } from '@/app/admin/components/cms-editor/AdminSortableRow';
import type { AdminHeroSettings } from '@/lib/catalogAdmin';
import { catalogImageFormatLabel, imageLabelFromPath } from '@/lib/catalogAdminFieldOptions';
import {
  editCarouselHeroFramingAction,
  editMainHeroFramingAction,
  removeCarouselHeroImageAction,
  removeMainHeroImageAction,
  reorderCarouselHeroImagesAction,
  updateCarouselHeroAltAction,
  uploadCarouselHeroImageAction,
  uploadCarouselHeroImagesBulkAction,
  uploadMainHeroImageAction,
} from './actions';

type Props = {
  settings: AdminHeroSettings;
};

type PendingCrop =
  | { mode: 'upload-carousel'; file: File }
  | { mode: 'upload-main'; file: File }
  | { mode: 'edit-carousel'; storagePath: string; file: File }
  | { mode: 'edit-main'; file: File };

async function fetchImageFile(storagePath: string): Promise<File> {
  const apiRes = await fetch(
    `/api/admin/products/catalog-image-url?path=${encodeURIComponent(storagePath)}`,
    { method: 'GET' }
  );
  const payload = (await apiRes.json().catch(() => ({}))) as { signedUrl?: string; error?: string };
  if (!apiRes.ok || !payload.signedUrl) {
    throw new Error(payload.error || 'Could not load image for editing');
  }

  const imgRes = await fetch(payload.signedUrl);
  if (!imgRes.ok) throw new Error('Failed to download image');
  const blob = await imgRes.blob();
  const name = storagePath.split('/').pop() ?? 'image.png';
  return new File([blob], name, { type: blob.type || 'image/png' });
}

function heroLoadingMessage(loading: string | null, bulkCount: number | null): string | null {
  if (!loading) return null;
  if (loading === 'carousel-bulk' && bulkCount) {
    return `Uploading ${bulkCount} hero image${bulkCount === 1 ? '' : 's'}…`;
  }
  if (loading === 'carousel-upload' || loading === 'main-upload') return 'Uploading image…';
  if (loading === 'main-framing' || loading.startsWith('framing-')) return 'Saving image framing…';
  if (loading === 'reorder') return 'Saving order…';
  if (loading === 'alt') return 'Saving alt text…';
  if (loading === 'main-remove' || loading.startsWith('remove-')) return 'Removing image…';
  return 'Saving…';
}

export function HeroSettingsClient({ settings }: Props) {
  const router = useRouter();
  const mainInputRef = useRef<HTMLInputElement>(null);
  const carouselInputRef = useRef<HTMLInputElement>(null);
  const carouselBulkInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [bulkUploadCount, setBulkUploadCount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [previewItem, setPreviewItem] = useState<{ url: string; title: string } | null>(null);
  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);
  const [framingError, setFramingError] = useState<string | null>(null);

  const carouselIds = settings.carousel.map((item) => item.storagePath);
  const processingMessage = heroLoadingMessage(loading, bulkUploadCount);
  const isProcessing = Boolean(processingMessage);

  function openPreview(item: { url: string; alt?: string; storagePath: string }) {
    setPreviewItem({
      url: item.url,
      title: item.alt?.trim() || imageLabelFromPath(item.storagePath),
    });
  }

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  async function runAction(
    key: string,
    fn: () => Promise<{ error?: string; message?: string }>,
    onSuccess?: () => void
  ) {
    clearMessages();
    setLoading(key);
    const result = await fn();
    setLoading(null);
    setBulkUploadCount(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(result.message ?? 'Saved.');
    onSuccess?.();
    router.refresh();
  }

  async function openEditFraming(storagePath: string) {
    setFramingError(null);
    try {
      const file = await fetchImageFile(storagePath);
      setPendingCrop({ mode: 'edit-carousel', storagePath, file });
    } catch (err) {
      console.error('[HeroSettingsClient] edit framing fetch failed:', err);
      setFramingError(err instanceof Error ? err.message : 'Could not load image for editing');
    }
  }

  async function openMainEditFraming() {
    if (!settings.heroStoragePath) return;
    setFramingError(null);
    try {
      const file = await fetchImageFile(settings.heroStoragePath);
      setPendingCrop({ mode: 'edit-main', file });
    } catch (err) {
      console.error('[HeroSettingsClient] edit main framing fetch failed:', err);
      setFramingError(err instanceof Error ? err.message : 'Could not load image for editing');
    }
  }

  async function handleMainUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingCrop({ mode: 'upload-main', file });
    event.target.value = '';
  }

  async function handleCarouselUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingCrop({ mode: 'upload-carousel', file });
    event.target.value = '';
  }

  async function handleCarouselBulkUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;

    clearMessages();
    setBulkUploadCount(files.length);
    setLoading('carousel-bulk');

    const formData = new FormData();
    formData.set('alt', 'Hero carousel');
    for (const file of files) {
      formData.append('files', file);
    }

    const result = await uploadCarouselHeroImagesBulkAction(formData);
    setLoading(null);
    setBulkUploadCount(null);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(result.message ?? 'Saved.');
    router.refresh();
  }

  async function applyCrop(crop: PendingCrop, file: File) {
    if (crop.mode === 'upload-carousel') {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('alt', 'Hero carousel');
      await runAction('carousel-upload', () => uploadCarouselHeroImageAction(formData));
      return;
    }

    if (crop.mode === 'upload-main') {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('alt', 'Homepage hero');
      await runAction('main-upload', () => uploadMainHeroImageAction(formData));
      return;
    }

    if (crop.mode === 'edit-carousel') {
      const formData = new FormData();
      formData.set('storagePath', crop.storagePath);
      formData.set('file', file);
      await runAction(`framing-${crop.storagePath}`, () => editCarouselHeroFramingAction(formData));
      return;
    }

    const formData = new FormData();
    formData.set('file', file);
    await runAction('main-framing', () => editMainHeroFramingAction(formData));
  }

  const cropIsEdit = pendingCrop?.mode === 'edit-carousel' || pendingCrop?.mode === 'edit-main';

  return (
    <div className="admin-cms-editor admin-hero-settings">
      {error ? (
        <p className="admin-cms-alert is-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="admin-cms-alert is-success" role="status">
          {success}
        </p>
      ) : null}
      {framingError ? (
        <p className="admin-cms-alert is-error" role="alert">
          {framingError}
        </p>
      ) : null}

      <AdminCmsSection
        label="Homepage hero images"
        helper="The first image is the main hero on the homepage. Drag to reorder the swipe stack. Bulk add skips cropping and converts images to WebP."
      >
        <div className={`admin-cms-image-list${isProcessing ? ' is-processing' : ''}`}>
          {processingMessage ? (
            <AdminImageProcessingBanner
              message={processingMessage}
              detail={
                loading === 'carousel-bulk'
                  ? 'Please wait — do not close this page until the upload finishes.'
                  : undefined
              }
            />
          ) : null}

          {settings.carousel.length === 0 ? (
            <p className="admin-cms-empty-hint">No hero images yet.</p>
          ) : (
            <AdminSortableList
              ids={carouselIds}
              onReorder={(orderedIds) =>
                runAction('reorder', () => reorderCarouselHeroImagesAction(orderedIds))
              }
              overlayTitle="Moving image…"
            >
              {settings.carousel.map((item, index) => (
                <AdminSortableRow
                  key={item.storagePath}
                  id={item.storagePath}
                  title={item.alt?.trim() || imageLabelFromPath(item.storagePath)}
                  onIconClick={() => openPreview(item)}
                  icon={
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt=""
                      className="admin-cms-image-thumb admin-cms-image-thumb--hero"
                    />
                  }
                  badge={
                    <span className="admin-cms-image-badges">
                      <span
                        className="admin-cms-badge-format"
                        title={`Format: ${catalogImageFormatLabel(item)}`}
                      >
                        {catalogImageFormatLabel(item)}
                      </span>
                      {index === 0 ? <span className="admin-cms-badge-main">Main</span> : null}
                    </span>
                  }
                  menu={
                    <AdminRowMenu
                      ariaLabel="Carousel image actions"
                      items={[
                        {
                          id: 'preview',
                          label: 'Preview image',
                          onClick: () => openPreview(item),
                        },
                        {
                          id: 'edit',
                          label: 'Edit alt text',
                          onClick: () => {
                            setEditingPath(item.storagePath);
                            setEditAlt(item.alt);
                          },
                        },
                        {
                          id: 'edit-framing',
                          label: 'Edit framing',
                          disabled: !!loading,
                          onClick: () => void openEditFraming(item.storagePath),
                        },
                        {
                          id: 'remove',
                          label: 'Remove',
                          destructive: true,
                          onClick: () => {
                            if (!window.confirm('Remove this carousel image?')) return;
                            runAction(`remove-${item.storagePath}`, () =>
                              removeCarouselHeroImageAction(item.storagePath)
                            );
                          },
                        },
                      ]}
                    />
                  }
                />
              ))}
            </AdminSortableList>
          )}

          <button
            type="button"
            className="admin-cms-btn admin-cms-btn-outline admin-cms-btn-block"
            disabled={isProcessing}
            onClick={() => carouselInputRef.current?.click()}
          >
            + Add hero image
          </button>
          <button
            type="button"
            className="admin-cms-btn admin-cms-btn-outline admin-cms-btn-block"
            disabled={isProcessing}
            onClick={() => carouselBulkInputRef.current?.click()}
          >
            + Add multiple images
          </button>
          <input
            ref={carouselInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="admin-cms-sr-only"
            onChange={handleCarouselUpload}
          />
          <input
            ref={carouselBulkInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="admin-cms-sr-only"
            onChange={handleCarouselBulkUpload}
          />
        </div>
      </AdminCmsSection>

      <AdminCmsCollapsibleSection
        label="Fallback hero image"
        helper="Only used when the carousel above is empty."
        defaultOpen={false}
      >
        <p className="admin-cms-empty-hint">
          {settings.heroImageUrl
            ? 'A fallback image is set.'
            : 'No fallback — stock placeholders appear when the carousel is empty.'}
        </p>
        <div className="admin-cms-image-edit-actions">
          <button
            type="button"
            className="admin-cms-btn admin-cms-btn-outline"
            disabled={isProcessing}
            onClick={() => mainInputRef.current?.click()}
          >
            {settings.heroImageUrl ? 'Replace fallback' : 'Upload fallback'}
          </button>
          {settings.heroImageUrl ? (
            <>
              <button
                type="button"
                className="admin-cms-btn admin-cms-btn-ghost"
                disabled={isProcessing}
                onClick={() =>
                  setPreviewItem({ url: settings.heroImageUrl!, title: 'Fallback hero image' })
                }
              >
                Preview
              </button>
              <button
                type="button"
                className="admin-cms-btn admin-cms-btn-ghost"
                disabled={isProcessing}
                onClick={() => void openMainEditFraming()}
              >
                Edit framing
              </button>
              <button
                type="button"
                className="admin-cms-btn admin-cms-btn-ghost admin-cms-btn-danger"
                disabled={isProcessing}
                onClick={() => {
                  if (!window.confirm('Remove the fallback hero image?')) return;
                  runAction('main-remove', removeMainHeroImageAction);
                }}
              >
                Remove
              </button>
            </>
          ) : null}
        </div>
        <input
          ref={mainInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="admin-cms-sr-only"
          onChange={handleMainUpload}
        />
      </AdminCmsCollapsibleSection>

      <AdminImagePreviewModal
        open={previewItem !== null}
        src={previewItem?.url ?? ''}
        title={previewItem?.title ?? 'Image preview'}
        alt={previewItem?.title ?? ''}
        onClose={() => setPreviewItem(null)}
      />

      <AdminImageAltModal
        open={editingPath !== null}
        altEn={editAlt}
        onAltEnChange={setEditAlt}
        onSave={() => {
          if (!editingPath) return;
          runAction('alt', () => updateCarouselHeroAltAction(editingPath, editAlt), () =>
            setEditingPath(null)
          );
        }}
        onClose={() => setEditingPath(null)}
        saving={loading === 'alt'}
      />

      <AdminImageCropModal
        open={Boolean(pendingCrop)}
        file={pendingCrop?.file ?? null}
        title={
          cropIsEdit
            ? 'Edit image framing'
            : pendingCrop?.mode === 'upload-main'
              ? 'Crop fallback hero image'
              : 'Crop new hero image'
        }
        aspect={cropIsEdit ? 1 : undefined}
        outputSize={cropIsEdit ? 2400 : undefined}
        outputMime={cropIsEdit ? 'image/png' : undefined}
        hideSkip={cropIsEdit}
        onCancel={() => setPendingCrop(null)}
        onSkip={
          cropIsEdit
            ? undefined
            : () => {
                const next = pendingCrop;
                setPendingCrop(null);
                if (!next) return;
                void applyCrop(next, next.file);
              }
        }
        onApply={({ file }) => {
          const next = pendingCrop;
          setPendingCrop(null);
          if (!next) return;
          void applyCrop(next, file);
        }}
      />
    </div>
  );
}
