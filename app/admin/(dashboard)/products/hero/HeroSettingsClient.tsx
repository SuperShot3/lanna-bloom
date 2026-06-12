'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent } from 'react';
import { AdminCmsCollapsibleSection } from '@/app/admin/components/cms-editor/AdminCmsCollapsibleSection';
import { AdminCmsSection } from '@/app/admin/components/cms-editor/AdminCmsSection';
import { AdminImageAltModal } from '@/app/admin/components/cms-editor/AdminImageAltModal';
import { AdminImagePreviewModal } from '@/app/admin/components/cms-editor/AdminImagePreviewModal';
import { AdminRowMenu } from '@/app/admin/components/cms-editor/AdminRowMenu';
import { AdminSortableList } from '@/app/admin/components/cms-editor/AdminSortableList';
import { AdminSortableRow } from '@/app/admin/components/cms-editor/AdminSortableRow';
import type { AdminHeroSettings } from '@/lib/catalogAdmin';
import { imageLabelFromPath } from '@/lib/catalogAdminFieldOptions';
import {
  removeCarouselHeroImageAction,
  removeMainHeroImageAction,
  reorderCarouselHeroImagesAction,
  updateCarouselHeroAltAction,
  uploadCarouselHeroImageAction,
  uploadMainHeroImageAction,
} from './actions';

type Props = {
  settings: AdminHeroSettings;
};

export function HeroSettingsClient({ settings }: Props) {
  const router = useRouter();
  const mainInputRef = useRef<HTMLInputElement>(null);
  const carouselInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [previewItem, setPreviewItem] = useState<{ url: string; title: string } | null>(null);

  const carouselIds = settings.carousel.map((item) => item.storagePath);

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
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(result.message ?? 'Saved.');
    onSuccess?.();
    router.refresh();
  }

  async function handleMainUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set('file', file);
    formData.set('alt', 'Homepage hero');
    await runAction('main-upload', () => uploadMainHeroImageAction(formData));
    event.target.value = '';
  }

  async function handleCarouselUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set('file', file);
    formData.set('alt', 'Hero carousel');
    await runAction('carousel-upload', () => uploadCarouselHeroImageAction(formData));
    event.target.value = '';
  }

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

      <AdminCmsSection
        label="Homepage hero images"
        helper="The first image is the main hero on the homepage. Drag to reorder the swipe stack."
      >
        <div className="admin-cms-image-list">
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
                    <img src={item.url} alt="" className="admin-cms-image-thumb" />
                  }
                  badge={index === 0 ? <span className="admin-cms-badge-main">Main</span> : null}
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
            disabled={!!loading}
            onClick={() => carouselInputRef.current?.click()}
          >
            + Add hero image
          </button>
          <input
            ref={carouselInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="admin-cms-sr-only"
            onChange={handleCarouselUpload}
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
            disabled={!!loading}
            onClick={() => mainInputRef.current?.click()}
          >
            {settings.heroImageUrl ? 'Replace fallback' : 'Upload fallback'}
          </button>
          {settings.heroImageUrl ? (
            <>
              <button
                type="button"
                className="admin-cms-btn admin-cms-btn-ghost"
                disabled={!!loading}
                onClick={() =>
                  setPreviewItem({ url: settings.heroImageUrl!, title: 'Fallback hero image' })
                }
              >
                Preview
              </button>
              <button
                type="button"
                className="admin-cms-btn admin-cms-btn-ghost admin-cms-btn-danger"
                disabled={!!loading}
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
    </div>
  );
}
