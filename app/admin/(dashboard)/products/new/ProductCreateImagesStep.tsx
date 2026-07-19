'use client';

import { useMemo, useState } from 'react';
import {
  DEFAULT_BASE_PRODUCT_PRESERVATION_PROMPT,
  DEFAULT_SAFE_PRESENTATION_PRESETS,
  type SafePresentationPresetKey,
} from '@/lib/adminProductAiRules';
import { AdminImagePreviewModal } from '@/app/admin/components/cms-editor/AdminImagePreviewModal';
import type {
  AiOptionCount,
  GenerationSession,
  ImageCandidate,
  ImageDraft,
} from './productCreateImageTypes';
import { getWebpPreview, hasReadyWebp } from './productCreateImageTypes';

const AI_OPTION_CHOICES: Array<{ value: AiOptionCount; label: string }> = [
  { value: 1, label: '1 option' },
  { value: 2, label: '2 options' },
  { value: 3, label: '3 options' },
];

type Props = {
  imageDrafts: ImageDraft[];
  generationSession: GenerationSession | null;
  optionalAiSourcePreview: string | null;
  aiOptionCount: AiOptionCount;
  basePreservationPrompt: string;
  presentationPresets: Record<SafePresentationPresetKey, string>;
  showRules: boolean;
  isBusy: boolean;
  isGenerating: boolean;
  statusLine: string;
  onAiOptionCountChange: (count: AiOptionCount) => void;
  onBasePreservationPromptChange: (value: string) => void;
  onPresentationPresetChange: (preset: SafePresentationPresetKey, value: string) => void;
  onShowRulesChange: (open: boolean) => void;
  onAddFiles: (files: File[]) => void;
  onCancelSession: () => void;
  onCreateOptionalAiImages: () => void;
  onToggleCandidate: (candidateId: string) => void;
  onSetCandidateMain: (candidateId: string) => void;
  onRetryCandidate: (candidateId: string) => void;
  onSetDraftPrimary: (imageId: string) => void;
  onRemoveDraft: (imageId: string) => void;
  canContinue: boolean;
  onContinue: () => void;
};

export function ProductCreateImagesStep({
  imageDrafts,
  generationSession,
  optionalAiSourcePreview,
  aiOptionCount,
  basePreservationPrompt,
  presentationPresets,
  showRules,
  isBusy,
  isGenerating,
  statusLine,
  onAiOptionCountChange,
  onBasePreservationPromptChange,
  onPresentationPresetChange,
  onShowRulesChange,
  onAddFiles,
  onCancelSession,
  onCreateOptionalAiImages,
  onToggleCandidate,
  onSetCandidateMain,
  onRetryCandidate,
  onSetDraftPrimary,
  onRemoveDraft,
  canContinue,
  onContinue,
}: Props) {
  const selectedCandidateCount =
    generationSession?.candidates.filter((candidate) => candidate.selected).length ?? 0;

  const showGenerationGrid =
    generationSession &&
    (generationSession.phase === 'generating' || generationSession.phase === 'select');
  const showOptionalAiSetup =
    Boolean(optionalAiSourcePreview) &&
    imageDrafts.length > 0 &&
    !showGenerationGrid;
  const showStatusBanner = Boolean(statusLine) && (isBusy || isGenerating);
  const uploadDisabled = isBusy || isGenerating;

  return (
    <section className="admin-product-create-step-panel">
      <header className="admin-product-create-step-header">
        <div>
          <span className="admin-product-create-eyebrow">Step 1</span>
          <h3>Images</h3>
          <p>
            Add your product photo. It becomes the catalog image automatically — no AI image
            generation required. Continue to text whenever the photo is ready.
          </p>
        </div>
      </header>

      <label className="admin-product-create-upload admin-product-create-upload-multi">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={uploadDisabled}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) onAddFiles(files);
            event.target.value = '';
          }}
        />
        <span className="admin-product-create-upload-empty">
          <span className="material-symbols-outlined">add_photo_alternate</span>
          <strong>Add product photo</strong>
          <small>JPEG, PNG, or WebP. Crop, then we attach the original as the product image.</small>
        </span>
      </label>

      {showStatusBanner ? (
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
            <strong>{statusLine || 'Working…'}</strong>
            <p>
              {isBusy
                ? 'Preparing your original photo for the catalog (WebP up to 2400px).'
                : 'Optional AI images can finish in the background — continue to text anytime.'}
            </p>
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
              />
            ))}
          </div>
        </section>
      ) : null}

      {showOptionalAiSetup ? (
        <section className="admin-product-create-generate-config" aria-label="Optional AI image alternatives">
          <div className="admin-product-create-generate-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={optionalAiSourcePreview!} alt="Source photo for optional AI alternatives" />
          </div>

          <fieldset className="admin-product-create-ai-count">
            <legend>Optional: create AI alternatives?</legend>
            <p className="admin-product-create-ai-count-hint">
              Skip this if you only want text. Your original photo is already the product image.
            </p>
            <div
              className="admin-product-create-segmented"
              role="radiogroup"
              aria-label="How many AI options would you like?"
            >
              {AI_OPTION_CHOICES.map((choice) => (
                <label
                  key={choice.value}
                  className={`admin-product-create-segmented-item${
                    aiOptionCount === choice.value ? ' is-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="ai-option-count"
                    value={choice.value}
                    checked={aiOptionCount === choice.value}
                    disabled={isBusy || isGenerating}
                    onChange={() => onAiOptionCountChange(choice.value)}
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="admin-product-create-generate-actions">
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              disabled={isBusy || isGenerating}
              onClick={onCreateOptionalAiImages}
            >
              Create AI alternatives
            </button>
          </div>
          <p className="admin-product-create-webp-note">
            AI image generation is optional. Prefer continuing to text with your original photo.
          </p>
        </section>
      ) : null}

      {showGenerationGrid ? (
        <CandidateSelectionGrid
          session={generationSession}
          isBusy={isBusy}
          selectedCount={selectedCandidateCount}
          onToggle={onToggleCandidate}
          onSetMain={onSetCandidateMain}
          onRetry={onRetryCandidate}
          onDismiss={onCancelSession}
        />
      ) : null}

      <details
        className="admin-product-create-rules"
        open={showRules}
        onToggle={(event) => onShowRulesChange((event.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="admin-product-create-rules-summary">
          <span className="admin-product-create-rules-summary-text">
            <span className="admin-product-create-eyebrow admin-product-create-rules-eyebrow">
              Advanced AI image settings
            </span>
            <small>
              Optional prompts for AI alternatives — used only if you create AI images.
            </small>
          </span>
          <span
            className="material-symbols-outlined admin-product-create-rules-chevron"
            aria-hidden
          >
            chevron_right
          </span>
        </summary>

        <div className="admin-product-create-rules-body">
          <p className="admin-hint admin-product-create-rules-intro">
            The <strong>base preservation prompt</strong> is sent for every AI option and tells the model to keep
            the real bouquet unchanged. Each <strong>option preset</strong> only adjusts background and studio lighting
            for that slot (option 1 → preset 1, and so on). <strong>Restore default</strong> puts a field back to the
            built-in wording; it does not run generation by itself.
          </p>

        <label className="admin-form-group">
          <span>Base preservation prompt (used for every AI option)</span>
          <textarea
            className="admin-input admin-product-create-textarea admin-product-create-rules-input"
            value={basePreservationPrompt}
            onChange={(event) => onBasePreservationPromptChange(event.target.value)}
            rows={8}
          />
          <small>This should strictly preserve the real product identity and composition.</small>
        </label>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          disabled={isBusy}
          aria-label="Restore base preservation prompt to default"
          onClick={() => onBasePreservationPromptChange(DEFAULT_BASE_PRODUCT_PRESERVATION_PROMPT)}
        >
          Restore default
        </button>

        <hr />

        <label className="admin-form-group">
          <span>Option 1 — Clean catalog (presentation preset)</span>
          <textarea
            className="admin-input admin-product-create-textarea admin-product-create-rules-input"
            value={presentationPresets[1]}
            onChange={(event) => onPresentationPresetChange(1, event.target.value)}
            rows={3}
          />
        </label>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          disabled={isBusy}
          aria-label="Restore option 1 presentation preset to default"
          onClick={() => onPresentationPresetChange(1, DEFAULT_SAFE_PRESENTATION_PRESETS[1])}
        >
          Restore default
        </button>

        <label className="admin-form-group">
          <span>Option 2 — Soft premium (presentation preset)</span>
          <textarea
            className="admin-input admin-product-create-textarea admin-product-create-rules-input"
            value={presentationPresets[2]}
            onChange={(event) => onPresentationPresetChange(2, event.target.value)}
            rows={3}
          />
        </label>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          disabled={isBusy}
          aria-label="Restore option 2 presentation preset to default"
          onClick={() => onPresentationPresetChange(2, DEFAULT_SAFE_PRESENTATION_PRESETS[2])}
        >
          Restore default
        </button>

        <label className="admin-form-group">
          <span>Option 3 — Bright storefront (presentation preset)</span>
          <textarea
            className="admin-input admin-product-create-textarea admin-product-create-rules-input"
            value={presentationPresets[3]}
            onChange={(event) => onPresentationPresetChange(3, event.target.value)}
            rows={3}
          />
        </label>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          disabled={isBusy}
          aria-label="Restore option 3 presentation preset to default"
          onClick={() => onPresentationPresetChange(3, DEFAULT_SAFE_PRESENTATION_PRESETS[3])}
        >
          Restore default
        </button>
        </div>
      </details>

      <div className="admin-product-create-image-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={!canContinue || isBusy}
          onClick={onContinue}
        >
          Continue to text →
        </button>
        {canContinue && !isBusy ? (
          <p className="admin-hint">
            Original photo is ready. Continue to generate product text — AI images are optional.
          </p>
        ) : null}
        {isGenerating && canContinue ? (
          <p className="admin-hint">AI options are still generating — you can continue now.</p>
        ) : null}
      </div>
    </section>
  );
}

function CandidateSelectionGrid({
  session,
  isBusy,
  selectedCount,
  onToggle,
  onSetMain,
  onRetry,
  onDismiss,
}: {
  session: GenerationSession;
  isBusy: boolean;
  selectedCount: number;
  onToggle: (candidateId: string) => void;
  onSetMain: (candidateId: string) => void;
  onRetry: (candidateId: string) => void;
  onDismiss: () => void;
}) {
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null);

  const aiCandidates = session.candidates.filter((candidate) => candidate.kind === 'ai');
  const aiSlots = session.aiOptionCount;

  const previewAlt = useMemo(() => preview?.title ?? 'Image preview', [preview?.title]);

  return (
    <section className="admin-product-create-selection" aria-label="Optional AI image alternatives">
      <div className="admin-product-create-selection-head">
        <h4>Optional AI alternatives</h4>
        <span>
          {selectedCount} image{selectedCount === 1 ? '' : 's'} selected
        </span>
      </div>
      <p className="admin-hint">
        Your original is already in the gallery. Select any AI options you want to add, or continue
        to text without them.
      </p>

      <div className="admin-product-create-image-grid admin-product-create-selection-grid">
        {Array.from({ length: aiSlots || aiCandidates.length }, (_, index) => {
          const slot = index + 1;
          const candidate = aiCandidates.find((row) => row.aiSlot === slot);
          if (candidate) {
            return (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                label={`AI option ${slot}`}
                isBusy={isBusy}
                onToggle={() => onToggle(candidate.id)}
                onSetMain={() => onSetMain(candidate.id)}
                onRetry={() => onRetry(candidate.id)}
                onZoom={() =>
                  setPreview({ src: getWebpPreview(candidate), title: `AI option ${slot}` })
                }
              />
            );
          }
          return (
            <PlaceholderCard key={`placeholder-${slot}`} label={`AI option ${slot}`} />
          );
        })}
      </div>

      <div className="admin-product-create-generate-actions">
        <button type="button" className="admin-btn admin-btn-text" disabled={isBusy} onClick={onDismiss}>
          Dismiss AI alternatives
        </button>
      </div>

      {preview ? (
        <AdminImagePreviewModal
          open={Boolean(preview)}
          src={preview.src}
          title={preview.title}
          alt={previewAlt}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </section>
  );
}

function CandidateCard({
  candidate,
  label,
  isBusy,
  onToggle,
  onSetMain,
  onRetry,
  onZoom,
}: {
  candidate: ImageCandidate;
  label: string;
  isBusy: boolean;
  onToggle: () => void;
  onSetMain: () => void;
  onRetry: () => void;
  onZoom: () => void;
}) {
  const isLoading =
    candidate.status === 'preparing' || candidate.status === 'generating' || candidate.status === 'queued';
  const isReady = candidate.status === 'ready';
  const canSelect = isReady && hasReadyWebp(candidate);

  return (
    <article
      className={`admin-product-create-image-card admin-product-create-selection-card${
        candidate.selected ? ' is-selected' : ''
      }${candidate.isMain ? ' is-primary' : ''}`}
    >
      <div className="admin-product-create-image-card-preview-wrap">
        <button
          type="button"
          className="admin-product-create-image-card-preview"
          disabled={isBusy || !canSelect}
          onClick={onToggle}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getWebpPreview(candidate)} alt="" />
          {isLoading ? (
            <div className="admin-product-create-image-card-overlay">
              <span className="admin-product-create-shimmer" aria-hidden="true" />
              <span>Creating…</span>
            </div>
          ) : null}
          <span className="admin-product-create-image-badge admin-product-create-image-badge-ai">AI</span>
          {candidate.selected ? <span className="admin-product-create-selected-indicator">✓</span> : null}
          {candidate.isMain && candidate.selected ? (
            <span className="admin-product-create-image-badge admin-product-create-image-badge-main">Main</span>
          ) : null}
        </button>

        <button
          type="button"
          className="admin-product-create-image-zoom"
          disabled={isBusy}
          aria-label={`Zoom ${label}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onZoom();
          }}
        >
          <span className="material-symbols-outlined" aria-hidden>
            zoom_in
          </span>
        </button>
      </div>

      <div className="admin-product-create-image-card-meta">
        <span>{label}</span>
        {candidate.status === 'ready' ? <small>Ready</small> : null}
        {candidate.status === 'error' ? (
          <small className="admin-product-create-image-error">{candidate.error ?? 'Failed'}</small>
        ) : null}
      </div>

      <div className="admin-product-create-image-card-actions">
        {candidate.selected && canSelect && !candidate.isMain ? (
          <button type="button" className="admin-btn admin-btn-outline" disabled={isBusy} onClick={onSetMain}>
            Set as Main
          </button>
        ) : null}
        {candidate.status === 'error' ? (
          <button type="button" className="admin-btn admin-btn-outline" disabled={isBusy} onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    </article>
  );
}

function PlaceholderCard({ label }: { label: string }) {
  return (
    <article className="admin-product-create-image-card admin-product-create-selection-card is-placeholder">
      <div className="admin-product-create-image-card-preview admin-product-create-placeholder-preview">
        <span className="admin-product-create-shimmer" aria-hidden="true" />
        <span>Creating…</span>
      </div>
      <div className="admin-product-create-image-card-meta">
        <span>{label}</span>
      </div>
    </article>
  );
}

function CommittedImageCard({
  image,
  index,
  isBusy,
  canSetPrimary,
  onSetPrimary,
  onRemove,
}: {
  image: ImageDraft;
  index: number;
  isBusy: boolean;
  canSetPrimary: boolean;
  onSetPrimary: () => void;
  onRemove: () => void;
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
        {image.enhanced ? (
          <span className="admin-product-create-image-badge admin-product-create-image-badge-ai">AI</span>
        ) : null}
      </div>
      <div className="admin-product-create-image-card-meta">
        <span>#{index + 1} · WebP ready</span>
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
