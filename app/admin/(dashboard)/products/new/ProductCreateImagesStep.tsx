'use client';

import { GPT_ITEM_CARD_LABEL, GPT_ITEM_CARD_URL } from '@/lib/adminGptItemCard';
import type { ImageDraft } from './productCreateImageTypes';
import { getWebpPreview } from './productCreateImageTypes';

type Props = {
  imageDrafts: ImageDraft[];
  isBusy: boolean;
  statusLine: string;
  onAddFiles: (files: File[]) => void;
  onSetDraftPrimary: (imageId: string) => void;
  onRemoveDraft: (imageId: string) => void;
  onToggleAiGenerated: (imageId: string, aiGenerated: boolean) => void;
  canContinue: boolean;
  onContinue: () => void;
};

export function ProductCreateImagesStep({
  imageDrafts,
  isBusy,
  statusLine,
  onAddFiles,
  onSetDraftPrimary,
  onRemoveDraft,
  onToggleAiGenerated,
  canContinue,
  onContinue,
}: Props) {
  return (
    <section className="admin-product-create-step-panel">
      <header className="admin-product-create-step-header">
        <div>
          <span className="admin-product-create-eyebrow">Step 1</span>
          <h3>Images</h3>
          <p>
            Add one or more product photos. They become catalog images automatically. Continue to
            copy whenever at least one photo is ready.
          </p>
        </div>
      </header>

      <label className="admin-product-create-upload admin-product-create-upload-multi">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={isBusy}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) onAddFiles(files);
            event.target.value = '';
          }}
        />
        <span className="admin-product-create-upload-empty">
          <span className="material-symbols-outlined">add_photo_alternate</span>
          <strong>Add product photos</strong>
          <small>
            JPEG, PNG, or WebP. Select multiple files for bulk add — crop each one, or use originals
            for all remaining.
          </small>
        </span>
      </label>

      {statusLine ? (
        <div className="admin-product-create-loading" aria-live="polite">
          <div className="admin-product-create-loader" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>{statusLine}</strong>
            <p>Preparing your photo for the catalog (WebP up to 2400px).</p>
          </div>
        </div>
      ) : null}

      {imageDrafts.length ? (
        <section className="admin-product-create-committed" aria-label="Images attached to this product">
          <div className="admin-product-create-committed-head">
            <h4>Product gallery</h4>
            <span>
              {imageDrafts.length} image{imageDrafts.length === 1 ? '' : 's'} attached
            </span>
          </div>
          <div className="admin-product-create-image-grid">
            {imageDrafts.map((image, index) => (
              <CommittedImageCard
                key={image.id}
                image={image}
                index={index}
                isBusy={isBusy}
                canSetPrimary={imageDrafts.length > 1}
                onSetPrimary={() => onSetDraftPrimary(image.id)}
                onRemove={() => onRemoveDraft(image.id)}
                onToggleAiGenerated={(aiGenerated) => onToggleAiGenerated(image.id, aiGenerated)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="admin-product-create-image-actions">
        <a
          className="admin-btn admin-btn-outline"
          href={GPT_ITEM_CARD_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {GPT_ITEM_CARD_LABEL}
        </a>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Continue to copy →
        </button>
        {canContinue ? (
          <p className="admin-hint">
            At least one photo is ready. Continue to generate product text.
            {isBusy ? ' More photos can finish preparing in the background.' : ''}
          </p>
        ) : (
          <p className="admin-hint">
            Need another image? Open the custom GPT, then add the downloaded file here.
          </p>
        )}
      </div>
    </section>
  );
}

function CommittedImageCard({
  image,
  index,
  isBusy,
  canSetPrimary,
  onSetPrimary,
  onRemove,
  onToggleAiGenerated,
}: {
  image: ImageDraft;
  index: number;
  isBusy: boolean;
  canSetPrimary: boolean;
  onSetPrimary: () => void;
  onRemove: () => void;
  onToggleAiGenerated: (aiGenerated: boolean) => void;
}) {
  const webpVariant = image.variants.find((variant) => variant.format === 'webp');
  const pngVariant = image.variants.find((variant) => variant.format === 'png_master');

  async function downloadVariant(storagePath: string) {
    if (!storagePath) return;
    const response = await fetch(
      `/api/admin/products/catalog-image-url?path=${encodeURIComponent(storagePath)}&download=1`,
      { method: 'GET' }
    );
    const payload = (await response.json().catch(() => ({}))) as { signedUrl?: string; error?: string };
    if (!response.ok || !payload.signedUrl) {
      console.error('[product-create] download failed:', payload.error || response.statusText);
      return;
    }
    window.location.href = payload.signedUrl;
  }

  return (
    <article className={`admin-product-create-image-card${image.isPrimary ? ' is-primary' : ''}`}>
      <div className="admin-product-create-image-card-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getWebpPreview(image)} alt="" />
        {image.isPrimary ? <span className="admin-product-create-image-badge">Main</span> : null}
      </div>
      <div className="admin-product-create-image-card-meta">
        <span>#{index + 1} · WebP ready</span>
        <label className="admin-cms-checkbox">
          <input
            type="checkbox"
            checked={image.aiGenerated === true}
            disabled={isBusy}
            onChange={(event) => onToggleAiGenerated(event.target.checked)}
          />
          <span>AI generated</span>
        </label>
      </div>
      <div className="admin-product-create-image-card-actions">
        {!image.isPrimary && canSetPrimary ? (
          <button type="button" className="admin-btn admin-btn-outline" disabled={isBusy} onClick={onSetPrimary}>
            Set as Main
          </button>
        ) : null}
        {webpVariant?.assetId ? (
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            disabled={isBusy}
            onClick={() => void downloadVariant(webpVariant.assetId)}
          >
            Download WebP
          </button>
        ) : null}
        {pngVariant?.assetId ? (
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            disabled={isBusy}
            onClick={() => void downloadVariant(pngVariant.assetId)}
          >
            Download PNG
          </button>
        ) : null}
        <button
          type="button"
          className="admin-btn admin-btn-outline admin-btn-danger"
          disabled={isBusy}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
    </article>
  );
}
