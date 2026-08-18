'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BOUQUET_PRESENTATION_FORMAT_OPTIONS } from '@/lib/bouquetPresentationFormats';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABEL, type ProductCategory } from '@/lib/catalogCategories';
import {
  DELIVERY_DESTINATIONS,
  destinationDisplayName,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import { AdminCheckboxGrid, AdminImageCropModal } from '@/app/admin/components/cms-editor';
import {
  ADMIN_COLOR_OPTIONS,
  ADMIN_DELIVERY_SPEED_OPTIONS,
  ADMIN_FLOWER_TYPE_OPTIONS,
  ADMIN_OCCASION_OPTIONS,
  ADMIN_PRICING_TYPE_OPTIONS,
  exclusiveDeliverySpeedOnChange,
} from '@/lib/catalogAdminFieldOptions';
import type { PricingType } from '@/lib/catalog/pricing';
import { useToast } from '@/contexts/ToastContext';
import { ProductCreateImagesStep } from './ProductCreateImagesStep';
import {
  type ImageDraft,
  type ImageVariant,
  hasReadyWebp,
  parseVariants,
} from './productCreateImageTypes';

type ProductImageAnalysis = {
  productFormat: string;
  identifiedFlowers: string[];
  colors: string[];
  greenery: string[];
  wrappingOrContainer: string;
  arrangementStyle: string;
  suggestedOccasions: string[];
  confidenceNotes: string;
  uncertainItems: string[];
  rawSummary: string;
};

type ProductDraftCopy = {
  nameEn: string;
  nameTh: string;
  descriptionEn: string;
  descriptionTh: string;
  compositionEn: string;
  compositionTh: string;
  altEn: string;
  altTh: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  searchPhrases: string[];
};

type ImageDraftWithAnalysis = ImageDraft & {
  analysis?: ProductImageAnalysis;
};

type SavedProduct = {
  id: string;
  slug: string;
  reviewUrl: string;
};

type Hints = {
  itemCategory: 'flowers' | ProductCategory;
  productType: string;
  notes: string;
};

type TextGenerationHistoryEntry = {
  id: string;
  nameEn: string;
  nameTh: string;
  generatedAt: string;
  account: string;
};

type WizardStep = 'images' | 'copy';

type LoadingState =
  | { kind: 'draft' }
  | { kind: 'publish' }
  | null;

const TEXT_GENERATION_HISTORY_KEY = 'admin-product-text-generation-history';
const TEXT_GENERATION_HISTORY_LIMIT = 12;

const emptyDraft: ProductDraftCopy = {
  nameEn: '',
  nameTh: '',
  descriptionEn: '',
  descriptionTh: '',
  compositionEn: '',
  compositionTh: '',
  altEn: '',
  altTh: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: [],
  searchPhrases: [],
};

const emptyHints: Hints = {
  itemCategory: 'flowers',
  productType: 'bouquet',
  notes: '',
};

const stepOrder: WizardStep[] = ['images', 'copy'];

const stepCopy: Record<WizardStep, { eyebrow: string; label: string; description: string }> = {
  images: {
    eyebrow: 'Step 1',
    label: 'Images',
    description: 'Upload a photo to use as the product image, then continue to copy.',
  },
  copy: {
    eyebrow: 'Step 2',
    label: 'Copy & save',
    description: 'Generate bilingual copy, set price and tags, then save the product for review.',
  },
};

const adminItemCategoryOptions: Array<{ value: Hints['itemCategory']; label: string }> = [
  { value: 'flowers', label: 'Flowers' },
  ...PRODUCT_CATEGORIES.map((value) => ({
    value,
    label: String(PRODUCT_CATEGORY_LABEL[value] ?? value),
  })),
];

const deliveryDestinationOptions: Array<{ value: DeliveryDestinationId; label: string }> =
  DELIVERY_DESTINATIONS.map((value) => ({
    value,
    label: destinationDisplayName(value, 'en'),
  }));

function normalizeAdminItemCategory(value: string): Hints['itemCategory'] {
  if (value === 'flowers') return 'flowers';
  if (PRODUCT_CATEGORIES.includes(value as ProductCategory)) return value as ProductCategory;
  return 'flowers';
}

function getAdminItemCategoryLabel(value: Hints['itemCategory']): string {
  return adminItemCategoryOptions.find((option) => option.value === value)?.label ?? value;
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter(Boolean);
}

function joinList(value: string[] | undefined): string {
  return (value ?? []).join(', ');
}

function isTextGenerationHistoryEntry(value: unknown): value is TextGenerationHistoryEntry {
  const entry = value as Partial<TextGenerationHistoryEntry>;
  return (
    typeof entry?.id === 'string' &&
    typeof entry.nameEn === 'string' &&
    typeof entry.nameTh === 'string' &&
    typeof entry.generatedAt === 'string' &&
    typeof entry.account === 'string'
  );
}

function readTextGenerationHistory(): TextGenerationHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(TEXT_GENERATION_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(isTextGenerationHistoryEntry).slice(0, TEXT_GENERATION_HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function saveTextGenerationHistory(history: TextGenerationHistoryEntry[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(TEXT_GENERATION_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // History is helpful, but product creation should continue if browser storage is unavailable.
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function presentationFormatFromAnalysis(analysis: ProductImageAnalysis | null): string {
  const text = `${analysis?.productFormat ?? ''} ${analysis?.wrappingOrContainer ?? ''}`.toLowerCase();
  if (text.includes('basket')) return 'basket';
  if (text.includes('vase')) return 'vase';
  if (text.includes('box')) return 'box';
  if (text.includes('pot') || text.includes('potted')) return 'potted';
  if (text.includes('arrangement')) return 'arrangement';
  return 'bouquet';
}

function hasPositivePrice(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;

  const numericPrice = Number(normalized);
  return Number.isFinite(numericPrice) && numericPrice > 0;
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const json = await response.json();
    return json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function ProductCreateWizard({ adminEmail }: { adminEmail: string }) {
  const { showToast } = useToast();
  const [activeStep, setActiveStep] = useState<WizardStep>('images');
  const [imageDrafts, setImageDrafts] = useState<ImageDraftWithAnalysis[]>([]);
  const [imageStatusLine, setImageStatusLine] = useState('');
  const [preparingImageCount, setPreparingImageCount] = useState(0);
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropBatchSize, setCropBatchSize] = useState(0);
  const isPreparingOriginal = preparingImageCount > 0;
  const pendingCropFile = cropQueue[0] ?? null;
  const cropQueueIndex = cropBatchSize > 0 ? cropBatchSize - cropQueue.length + 1 : 1;

  const [hints, setHints] = useState<Hints>(emptyHints);
  const [analysis, setAnalysis] = useState<ProductImageAnalysis | null>(null);
  const [draft, setDraft] = useState<ProductDraftCopy>(emptyDraft);

  const [price, setPrice] = useState('');
  const [colorTags, setColorTags] = useState<string[]>([]);
  const [flowerTypes, setFlowerTypes] = useState<string[]>([]);
  const [occasionTags, setOccasionTags] = useState<string[]>([]);
  const [presentationCsv, setPresentationCsv] = useState('bouquet');
  const [deliveryOptions, setDeliveryOptions] = useState<string[]>(['same_day']);
  const [availableDeliveryDestinations, setAvailableDeliveryDestinations] = useState<DeliveryDestinationId[]>([
    ...DELIVERY_DESTINATIONS,
  ]);
  const [featuredPopular, setFeaturedPopular] = useState(false);
  const [contactBeforeOrder, setContactBeforeOrder] = useState(false);
  const [pricingType, setPricingType] = useState<PricingType>('single_price');

  const [loading, setLoading] = useState<LoadingState>(null);
  const [error, setError] = useState('');
  const [savedProduct, setSavedProduct] = useState<SavedProduct | null>(null);
  const [textGenerationHistory, setTextGenerationHistory] = useState<TextGenerationHistoryEntry[]>([]);

  const primaryDraft = useMemo(() => imageDrafts.find((d) => d.isPrimary), [imageDrafts]);
  const readyDrafts = imageDrafts.filter((d) => hasReadyWebp(d));
  const hasPrimaryReady = readyDrafts.some((d) => d.isPrimary);
  const isFlowerProduct = hints.itemCategory === 'flowers';
  const itemCategoryLabel = getAdminItemCategoryLabel(hints.itemCategory);

  const stepCompletion: Record<WizardStep, boolean> = {
    images: hasPrimaryReady,
    copy: Boolean(savedProduct),
  };

  const canContinueFromImages = useMemo(
    () => hasPrimaryReady && imageDrafts.length > 0 && imageDrafts.every((row) => hasReadyWebp(row)),
    [hasPrimaryReady, imageDrafts]
  );

  const canSaveForReview = useMemo(
    () => Boolean(draft.nameEn.trim() && hasPositivePrice(price) && hasPrimaryReady),
    [draft.nameEn, price, hasPrimaryReady]
  );

  useEffect(() => {
    setTextGenerationHistory(readTextGenerationHistory());
  }, []);

  useEffect(() => {
    return () => {
      imageDrafts.forEach((d) => {
        try {
          URL.revokeObjectURL(d.localPreview);
        } catch {
          // ignore
        }
      });
    };
    // We only want this on unmount; the drafts are immutable file refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateHint(key: keyof Hints, value: string) {
    setHints((current) => ({ ...current, [key]: value }));
  }

  function toggleAvailableDeliveryDestination(value: DeliveryDestinationId) {
    setAvailableDeliveryDestinations((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
    setSavedProduct(null);
  }

  function updateProductType(value: string) {
    updateHint('productType', value);
    setPresentationCsv(value);
  }

  function updateItemCategory(value: string) {
    const nextCategory = normalizeAdminItemCategory(value);
    setHints((current) => ({
      ...current,
      itemCategory: nextCategory,
      productType: nextCategory === 'flowers' ? current.productType || 'bouquet' : nextCategory,
    }));
    if (nextCategory !== 'flowers') {
      setPresentationCsv('');
      setFlowerTypes([]);
      setColorTags([]);
      setFeaturedPopular(false);
    } else if (!presentationCsv) {
      setPresentationCsv('bouquet');
    }
    setSavedProduct(null);
  }

  function updateDraft(key: keyof ProductDraftCopy, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateAnalysis(key: keyof ProductImageAnalysis, value: string) {
    if (!analysis) return;
    const listFields: Array<keyof ProductImageAnalysis> = [
      'identifiedFlowers',
      'colors',
      'greenery',
      'suggestedOccasions',
      'uncertainItems',
    ];
    setAnalysis({
      ...analysis,
      [key]: listFields.includes(key) ? splitList(value) : value,
    });
  }

  function recordTextGeneration(nextDraft: ProductDraftCopy) {
    const entry: TextGenerationHistoryEntry = {
      id: createId(),
      nameEn: nextDraft.nameEn || 'Untitled product',
      nameTh: nextDraft.nameTh,
      generatedAt: new Date().toISOString(),
      account: adminEmail || 'Unknown account',
    };

    setTextGenerationHistory((current) => {
      const next = [entry, ...current].slice(0, TEXT_GENERATION_HISTORY_LIMIT);
      saveTextGenerationHistory(next);
      return next;
    });
  }

  function setPrimary(imageId: string) {
    setImageDrafts((current) => current.map((d) => ({ ...d, isPrimary: d.id === imageId })));
    setSavedProduct(null);
  }

  function removeDraft(imageId: string) {
    setImageDrafts((current) => {
      const target = current.find((d) => d.id === imageId);
      if (target) {
        try {
          URL.revokeObjectURL(target.localPreview);
        } catch {
          // ignore
        }
      }
      const next = current.filter((d) => d.id !== imageId);
      const hasPrimary = next.some((d) => d.isPrimary);
      if (!hasPrimary && next.length) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
    setSavedProduct(null);
  }

  function enqueueCropFiles(files: File[]) {
    const nextFiles = files.filter(Boolean);
    if (!nextFiles.length) return;
    setCropQueue((current) => {
      if (current.length === 0) {
        setCropBatchSize(nextFiles.length);
      } else {
        setCropBatchSize((size) => size + nextFiles.length);
      }
      return [...current, ...nextFiles];
    });
  }

  function beginPreparingImages(count: number) {
    setPreparingImageCount((current) => {
      const next = current + count;
      setImageStatusLine(
        next === 1 ? 'Preparing product photo…' : `Preparing ${next} product photos…`
      );
      return next;
    });
  }

  function endPreparingImage() {
    setPreparingImageCount((current) => {
      const next = Math.max(0, current - 1);
      if (next === 0) {
        setImageStatusLine('');
      } else {
        setImageStatusLine(
          next === 1 ? 'Preparing product photo…' : `Preparing ${next} product photos…`
        );
      }
      return next;
    });
  }

  async function prepareCandidateFile(
    file: File,
    alt: string
  ): Promise<{ variants: ImageVariant[]; serverPreview?: string } | { error: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt', alt);
    const response = await fetch('/api/admin/products/prepare-image', { method: 'POST', body: formData });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      return { error: String(payload.error ?? 'Failed to prepare image.') };
    }
    const previews = payload.previews as { webp?: string } | undefined;
    return {
      variants: parseVariants(payload.variants),
      serverPreview: previews?.webp,
    };
  }

  async function attachOriginalAsProductImage(file: File, options?: { silent?: boolean }) {
    setError('');
    setSavedProduct(null);
    beginPreparingImages(1);

    const localPreview = URL.createObjectURL(file);

    try {
      const alt = draft.altEn || draft.nameEn || file.name;
      const result = await prepareCandidateFile(file, alt);
      if ('error' in result) {
        try {
          URL.revokeObjectURL(localPreview);
        } catch {
          // ignore
        }
        showToast(result.error || 'Failed to prepare a product photo.', { variant: 'error' });
        if (!options?.silent) {
          setError(result.error || 'Failed to prepare a product photo.');
        }
        return;
      }

      setImageDrafts((current) => {
        const hasPrimary = current.some((row) => row.isPrimary);
        return [
          ...current,
          {
            id: createId(),
            file,
            localPreview: result.serverPreview ?? localPreview,
            variants: result.variants,
            serverPreview: result.serverPreview,
            isPrimary: !hasPrimary,
          },
        ];
      });

      if (result.serverPreview) {
        try {
          URL.revokeObjectURL(localPreview);
        } catch {
          // ignore
        }
      }

      if (!options?.silent) {
        showToast('Photo added to the product gallery. You can generate text next.');
      }
    } catch {
      try {
        URL.revokeObjectURL(localPreview);
      } catch {
        // ignore
      }
      showToast('Could not prepare a product photo. Check your connection and try again.', {
        variant: 'error',
      });
      if (!options?.silent) {
        setError('Could not prepare a product photo. Check your connection and try again.');
      }
    } finally {
      endPreparingImage();
    }
  }

  function advanceCropQueue() {
    setCropQueue((current) => {
      const next = current.slice(1);
      if (next.length === 0) setCropBatchSize(0);
      return next;
    });
  }

  function applyPendingCrop(file: File) {
    const remainingAfter = cropQueue.length - 1;
    advanceCropQueue();
    void attachOriginalAsProductImage(file, { silent: remainingAfter > 0 });
  }

  function skipPendingCrop() {
    if (!pendingCropFile) return;
    const remainingAfter = cropQueue.length - 1;
    const current = pendingCropFile;
    advanceCropQueue();
    void attachOriginalAsProductImage(current, { silent: remainingAfter > 0 });
  }

  function skipAllPendingCrops() {
    if (!cropQueue.length) return;
    const files = [...cropQueue];
    setCropQueue([]);
    setCropBatchSize(0);
    showToast(
      files.length === 1
        ? 'Adding photo to the gallery…'
        : `Adding ${files.length} photos to the gallery…`
    );
    for (const file of files) {
      void attachOriginalAsProductImage(file, { silent: true });
    }
  }

  function cancelCropQueue() {
    setCropQueue([]);
    setCropBatchSize(0);
  }

  function handleImagesContinue() {
    if (!hasPrimaryReady) {
      setError('Add a product photo first. The original image is enough to continue to copy.');
      return;
    }

    if (imageDrafts.some((row) => !hasReadyWebp(row))) {
      setError('Every gallery image must have a ready WebP version before continuing.');
      return;
    }

    setError('');
    setActiveStep('copy');
  }

  async function requestDraft() {
    const reference = primaryDraft ?? imageDrafts[0];
    if (!reference) {
      setError('Add at least one image before generating product text.');
      return;
    }

    setError('');
    setSavedProduct(null);
    setLoading({ kind: 'draft' });
    const formData = new FormData();
    formData.append('file', reference.file);
    formData.append(
      'hints',
      JSON.stringify({
        itemCategory: hints.itemCategory,
        productType: hints.productType,
        occasion: occasionTags.join(', '),
        colors: colorTags.join(', '),
        price,
        notes: hints.notes,
      })
    );

    try {
      const response = await fetch('/api/admin/products/ai-draft', {
        method: 'POST',
        body: formData,
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        setError(String(payload.error ?? 'Failed to create AI draft.'));
        return;
      }

      const nextAnalysis = payload.analysis as ProductImageAnalysis;
      const nextDraft = payload.draft as ProductDraftCopy;
      setAnalysis(nextAnalysis);
      setDraft(nextDraft);
      recordTextGeneration(nextDraft);
      if (isFlowerProduct) {
        const format = presentationFormatFromAnalysis(nextAnalysis);
        setPresentationCsv(format);
        setHints((current) => ({ ...current, productType: format }));
      } else {
        setPresentationCsv('');
      }

      setImageDrafts((current) =>
        current.map((d) => (d.id === reference.id ? { ...d, analysis: nextAnalysis } : d))
      );
    } catch {
      setError('Could not create the AI draft. Check your connection and try again.');
    } finally {
      setLoading(null);
    }
  }

  async function saveProductForReview() {
    if (!hasPositivePrice(price)) {
      setError('Enter a product price greater than 0 before saving for review.');
      return;
    }
    if (!hasPrimaryReady) {
      setError('Select at least one WebP-ready image and mark it as Main before saving.');
      return;
    }
    if (imageDrafts.some((row) => !hasReadyWebp(row))) {
      setError('Every selected gallery image must have a ready WebP asset before saving.');
      return;
    }

    const primaryId = primaryDraft?.id ?? readyDrafts[0]?.id ?? null;
    const altFallback = draft.altEn || draft.nameEn;
    const imagesPayload: Array<{ assetId: string; alt?: string; format?: string; isPrimary: boolean }> = [];

    readyDrafts.forEach((d) => {
      (d.variants ?? []).forEach((variant) => {
        if (variant.format !== 'webp') return;
        imagesPayload.push({
          assetId: variant.assetId,
          alt: variant.alt || altFallback,
          format: 'webp',
          isPrimary: d.id === primaryId,
        });
      });
    });

    setError('');
    setLoading({ kind: 'publish' });
    try {
      const response = await fetch('/api/admin/products/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          itemCategory: hints.itemCategory,
          price,
          images: imagesPayload,
          colors: colorTags,
          flowerTypes,
          occasion: occasionTags,
          presentationFormats: splitList(presentationCsv),
          deliveryOptions,
          excludedDeliveryDestinations: DELIVERY_DESTINATIONS.filter(
            (destination) => !availableDeliveryDestinations.includes(destination)
          ),
          featuredPopular,
          contactBeforeOrder,
          pricingType: isFlowerProduct ? pricingType : 'single_price',
        }),
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        setError(String(payload.error ?? 'Could not save this product for review.'));
        return;
      }

      setSavedProduct({
        id: String(payload.id),
        slug: String(payload.slug),
        reviewUrl: String(payload.reviewUrl || `/admin/products/bouquet/${payload.id}`),
      });
    } catch {
      setError('Could not save this product for review. Check your connection and try again.');
    } finally {
      setLoading(null);
    }
  }

  function resetWizard() {
    imageDrafts.forEach((d) => {
      try {
        URL.revokeObjectURL(d.localPreview);
      } catch {
        // ignore
      }
    });
    setImageDrafts([]);
    setImageStatusLine('');
    setPreparingImageCount(0);
    setCropQueue([]);
    setCropBatchSize(0);
    setHints(emptyHints);
    setAnalysis(null);
    setDraft(emptyDraft);
    setPrice('');
    setColorTags([]);
    setFlowerTypes([]);
    setOccasionTags([]);
    setPresentationCsv('bouquet');
    setDeliveryOptions(['same_day']);
    setAvailableDeliveryDestinations([...DELIVERY_DESTINATIONS]);
    setFeaturedPopular(false);
    setContactBeforeOrder(false);
    setPricingType('single_price');
    setLoading(null);
    setError('');
    setSavedProduct(null);
    setActiveStep('images');
  }

  return (
    <div className="admin-orders admin-product-create">
      <nav className="admin-product-create-stepper" aria-label="Product creation steps">
        {stepOrder.map((step, index) => {
          const isActive = activeStep === step;
          const isComplete = stepCompletion[step];
          return (
            <button
              key={step}
              type="button"
              className={`admin-product-create-stepper-item${isActive ? ' is-active' : ''}${
                isComplete ? ' is-complete' : ''
              }`}
              onClick={() => setActiveStep(step)}
            >
              <span className="admin-product-create-stepper-number">{isComplete ? '✓' : index + 1}</span>
              <span className="admin-product-create-stepper-text">
                <strong>{stepCopy[step].label}</strong>
                <small>{stepCopy[step].eyebrow}</small>
              </span>
            </button>
          );
        })}
      </nav>

      {error ? (
        <div className="admin-product-create-alert" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">
            error
          </span>
          <div>
            <strong>Could not complete this step</strong>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {savedProduct ? (
        <section className="admin-product-create-success-page" aria-live="polite">
          <span className="material-symbols-outlined admin-product-create-success-icon" aria-hidden="true">
            check_circle
          </span>
          <span className="admin-product-create-eyebrow">Saved for review</span>
          <h2>Product is saved but not live</h2>
          <p>
            This item is hidden from the public catalog until an owner or admin approves it. Share the internal
            review page with the team when it is ready.
          </p>
          <dl className="admin-product-create-result-meta">
            <div>
              <dt>Catalog ID</dt>
              <dd>{savedProduct.id}</dd>
            </div>
            <div>
              <dt>Catalog slug</dt>
              <dd>{savedProduct.slug}</dd>
            </div>
            <div>
              <dt>Review link</dt>
              <dd>{savedProduct.reviewUrl}</dd>
            </div>
          </dl>
          <div className="admin-product-create-result-actions">
            <Link className="admin-btn admin-btn-primary" href={savedProduct.reviewUrl}>
              Open review page
            </Link>
            <Link className="admin-btn admin-btn-outline" href="/admin/products">
              View moderation queue
            </Link>
            <button className="admin-btn admin-btn-outline" type="button" onClick={resetWizard}>
              Create another product
            </button>
          </div>
        </section>
      ) : (
        <>
          {activeStep === 'images' ? (
            <ProductCreateImagesStep
              imageDrafts={imageDrafts}
              isBusy={isPreparingOriginal}
              statusLine={imageStatusLine}
              onAddFiles={enqueueCropFiles}
              onSetDraftPrimary={setPrimary}
              onRemoveDraft={removeDraft}
              canContinue={canContinueFromImages}
              onContinue={handleImagesContinue}
            />
          ) : null}

          {activeStep === 'copy' ? (
            <CopySaveStep
              primaryDraft={primaryDraft ?? imageDrafts[0] ?? null}
              readyDraftsCount={readyDrafts.length}
              hints={hints}
              isFlowerProduct={isFlowerProduct}
              itemCategoryLabel={itemCategoryLabel}
              draft={draft}
              analysis={analysis}
              price={price}
              setPrice={setPrice}
              colorTags={colorTags}
              setColorTags={setColorTags}
              flowerTypes={flowerTypes}
              setFlowerTypes={setFlowerTypes}
              occasionTags={occasionTags}
              setOccasionTags={setOccasionTags}
              deliveryOptions={deliveryOptions}
              setDeliveryOptions={setDeliveryOptions}
              availableDeliveryDestinations={availableDeliveryDestinations}
              onToggleDeliveryDestination={toggleAvailableDeliveryDestination}
              featuredPopular={featuredPopular}
              setFeaturedPopular={setFeaturedPopular}
              contactBeforeOrder={contactBeforeOrder}
              setContactBeforeOrder={setContactBeforeOrder}
              pricingType={pricingType}
              setPricingType={setPricingType}
              loading={loading}
              canSaveForReview={canSaveForReview}
              onChangeHint={updateHint}
              onChangeItemCategory={updateItemCategory}
              onChangeProductType={updateProductType}
              onChangeDraft={updateDraft}
              onChangeAnalysis={updateAnalysis}
              onGenerateText={requestDraft}
              onBack={() => setActiveStep('images')}
              onSave={saveProductForReview}
            />
          ) : null}
        </>
      )}

      <AdminImageCropModal
        open={Boolean(pendingCropFile)}
        file={pendingCropFile}
        title={
          cropBatchSize > 1
            ? `Crop image ${cropQueueIndex} of ${cropBatchSize}`
            : 'Crop new image'
        }
        onCancel={cancelCropQueue}
        onSkip={skipPendingCrop}
        onSkipAll={cropQueue.length > 1 ? skipAllPendingCrops : undefined}
        skipAllLabel={`Use original for all ${cropQueue.length} remaining`}
        onApply={({ file }) => applyPendingCrop(file)}
      />

      <section className="admin-product-create-history" aria-labelledby="text-generation-history-title">
        <div className="admin-product-create-history-head">
          <div>
            <span className="admin-product-create-eyebrow">Text history</span>
            <h2 id="text-generation-history-title">Recent generated text</h2>
            <p>Product names generated on this browser, with the account that generated them.</p>
          </div>
          {textGenerationHistory.length ? (
            <span className="admin-product-create-history-count">{textGenerationHistory.length}</span>
          ) : null}
        </div>

        {textGenerationHistory.length ? (
          <div className="admin-product-create-history-list">
            {textGenerationHistory.map((entry) => (
              <article className="admin-product-create-history-item" key={entry.id}>
                <span className="material-symbols-outlined admin-product-create-history-icon" aria-hidden="true">
                  history
                </span>
                <div>
                  <strong>{entry.nameEn || entry.nameTh || 'Untitled product'}</strong>
                  {entry.nameTh ? <span>{entry.nameTh}</span> : null}
                  <small>
                    Generated {formatGeneratedAt(entry.generatedAt)} by {entry.account}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-product-create-history-empty">Generated product names will appear here after you use Generate text.</p>
        )}
      </section>
    </div>
  );
}

type CopySaveStepProps = {
  primaryDraft: ImageDraft | null;
  readyDraftsCount: number;
  hints: Hints;
  isFlowerProduct: boolean;
  itemCategoryLabel: string;
  draft: ProductDraftCopy;
  analysis: ProductImageAnalysis | null;
  price: string;
  setPrice: (value: string) => void;
  colorTags: string[];
  setColorTags: (value: string[]) => void;
  flowerTypes: string[];
  setFlowerTypes: (value: string[]) => void;
  occasionTags: string[];
  setOccasionTags: (value: string[]) => void;
  deliveryOptions: string[];
  setDeliveryOptions: (value: string[]) => void;
  availableDeliveryDestinations: DeliveryDestinationId[];
  onToggleDeliveryDestination: (value: DeliveryDestinationId) => void;
  featuredPopular: boolean;
  setFeaturedPopular: (value: boolean) => void;
  contactBeforeOrder: boolean;
  setContactBeforeOrder: (value: boolean) => void;
  pricingType: PricingType;
  setPricingType: (value: PricingType) => void;
  loading: LoadingState;
  canSaveForReview: boolean;
  onChangeHint: (key: keyof Hints, value: string) => void;
  onChangeItemCategory: (value: string) => void;
  onChangeProductType: (value: string) => void;
  onChangeDraft: (key: keyof ProductDraftCopy, value: string) => void;
  onChangeAnalysis: (key: keyof ProductImageAnalysis, value: string) => void;
  onGenerateText: () => Promise<void>;
  onBack: () => void;
  onSave: () => Promise<void>;
};

function CopySaveStep({
  primaryDraft,
  readyDraftsCount,
  hints,
  isFlowerProduct,
  itemCategoryLabel,
  draft,
  analysis,
  price,
  setPrice,
  colorTags,
  setColorTags,
  flowerTypes,
  setFlowerTypes,
  occasionTags,
  setOccasionTags,
  deliveryOptions,
  setDeliveryOptions,
  availableDeliveryDestinations,
  onToggleDeliveryDestination,
  featuredPopular,
  setFeaturedPopular,
  contactBeforeOrder,
  setContactBeforeOrder,
  pricingType,
  setPricingType,
  loading,
  canSaveForReview,
  onChangeHint,
  onChangeItemCategory,
  onChangeProductType,
  onChangeDraft,
  onChangeAnalysis,
  onGenerateText,
  onBack,
  onSave,
}: CopySaveStepProps) {
  const isBusy = Boolean(loading);

  return (
    <section className="admin-product-create-step-panel">
      <header className="admin-product-create-step-header">
        <div>
          <span className="admin-product-create-eyebrow">{stepCopy.copy.eyebrow}</span>
          <h3>{stepCopy.copy.label}</h3>
          <p>{stepCopy.copy.description}</p>
        </div>
        {primaryDraft ? (
          <div className="admin-product-create-step-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primaryDraft.serverPreview || primaryDraft.localPreview} alt="Reference for text" />
            <small>Main image used for AI analysis</small>
          </div>
        ) : null}
      </header>

      <section className="admin-product-create-grid">
        <div className="admin-product-create-card">
          <div>
            <div className="admin-product-create-step">Hints</div>
            <p className="admin-product-create-card-hint">
              These details guide AI copy and are saved on the product. Color and occasion are selected once.
            </p>
          </div>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Item category</span>
              <select
                className="admin-input"
                value={hints.itemCategory}
                onChange={(event) => onChangeItemCategory(event.target.value)}
              >
                {adminItemCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-form-group">
              <span>Price THB</span>
              <input
                className="admin-input"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
              <small>Product price only. Exclude delivery.</small>
            </label>
          </div>
          {isFlowerProduct ? (
            <label className="admin-form-group">
              <span>Bouquet presentation</span>
              <select
                className="admin-input"
                value={hints.productType}
                onChange={(event) => onChangeProductType(event.target.value)}
              >
                {BOUQUET_PRESENTATION_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.title}
                  </option>
                ))}
              </select>
              <small>Used by AI and saved as the flower presentation format.</small>
            </label>
          ) : (
            <p className="admin-hint">
              AI will write copy for {itemCategoryLabel.toLowerCase()} and save it as a non-flower product.
            </p>
          )}
          <fieldset className="admin-form-group admin-product-create-occasion-hints">
            <legend>Occasion</legend>
            <p className="admin-product-create-card-hint">
              Guides AI copy and becomes the catalog occasion filters.
            </p>
            <AdminCheckboxGrid
              idPrefix="create-occasion-tags"
              options={[...ADMIN_OCCASION_OPTIONS]}
              selected={occasionTags}
              onChange={setOccasionTags}
            />
          </fieldset>
          <fieldset className="admin-form-group admin-product-create-occasion-hints">
            <legend>Colors</legend>
            <p className="admin-product-create-card-hint">
              Guides AI copy and becomes the catalog color filters.
            </p>
            <AdminCheckboxGrid
              idPrefix="create-color-tags"
              options={[...ADMIN_COLOR_OPTIONS]}
              selected={colorTags}
              onChange={setColorTags}
            />
          </fieldset>
          <label className="admin-form-group">
            <span>AI notes</span>
            <textarea
              className="admin-input admin-product-create-textarea"
              value={hints.notes}
              onChange={(event) => onChangeHint('notes', event.target.value)}
              placeholder="Example: preserve the basket, write for birthday and congratulations shoppers"
            />
          </label>
          <button
            className="admin-btn admin-btn-primary admin-product-create-main-action"
            type="button"
            disabled={isBusy || !primaryDraft}
            onClick={onGenerateText}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              auto_awesome
            </span>
            {loading?.kind === 'draft' ? 'Generating text…' : 'Generate text'}
          </button>
        </div>

        <div className="admin-product-create-card">
          <div>
            <div className="admin-product-create-step">Bilingual copy</div>
            <p className="admin-product-create-card-hint">
              Edit the English and Thai copy exactly as it should appear to customers.
            </p>
          </div>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Name EN</span>
              <input
                className="admin-input"
                value={draft.nameEn}
                onChange={(event) => onChangeDraft('nameEn', event.target.value)}
              />
            </label>
            <label className="admin-form-group">
              <span>Name TH</span>
              <input
                className="admin-input"
                value={draft.nameTh}
                onChange={(event) => onChangeDraft('nameTh', event.target.value)}
              />
            </label>
          </div>
          <label className="admin-form-group">
            <span>Description EN</span>
            <textarea
              className="admin-input admin-product-create-textarea"
              value={draft.descriptionEn}
              onChange={(event) => onChangeDraft('descriptionEn', event.target.value)}
            />
          </label>
          <label className="admin-form-group">
            <span>Description TH</span>
            <textarea
              className="admin-input admin-product-create-textarea"
              value={draft.descriptionTh}
              onChange={(event) => onChangeDraft('descriptionTh', event.target.value)}
            />
          </label>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Composition EN</span>
              <input
                className="admin-input"
                value={draft.compositionEn}
                onChange={(event) => onChangeDraft('compositionEn', event.target.value)}
              />
            </label>
            <label className="admin-form-group">
              <span>Composition TH</span>
              <input
                className="admin-input"
                value={draft.compositionTh}
                onChange={(event) => onChangeDraft('compositionTh', event.target.value)}
              />
            </label>
          </div>
          <label className="admin-form-group">
            <span>Image alt text (EN)</span>
            <input
              className="admin-input"
              value={draft.altEn}
              onChange={(event) => onChangeDraft('altEn', event.target.value)}
            />
          </label>
        </div>
      </section>

      {analysis ? (
        <details className="admin-product-create-analysis">
          <summary>Edit AI image analysis (optional)</summary>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>{isFlowerProduct ? 'Visible flowers' : 'Visible items'}</span>
              <input
                className="admin-input"
                value={joinList(analysis.identifiedFlowers)}
                onChange={(event) => onChangeAnalysis('identifiedFlowers', event.target.value)}
              />
            </label>
            <label className="admin-form-group">
              <span>Colors</span>
              <input
                className="admin-input"
                value={joinList(analysis.colors)}
                onChange={(event) => onChangeAnalysis('colors', event.target.value)}
              />
            </label>
          </div>
          <label className="admin-form-group">
            <span>Format and container</span>
            <input
              className="admin-input"
              value={`${analysis.productFormat} - ${analysis.wrappingOrContainer}`}
              onChange={(event) => onChangeAnalysis('productFormat', event.target.value)}
            />
          </label>
          <label className="admin-form-group">
            <span>Uncertain items</span>
            <input
              className="admin-input"
              value={joinList(analysis.uncertainItems)}
              onChange={(event) => onChangeAnalysis('uncertainItems', event.target.value)}
            />
          </label>
          <p className="admin-product-create-note">{analysis.rawSummary || analysis.confidenceNotes}</p>
        </details>
      ) : null}

      <div className="admin-product-create-card">
        <div>
          <div className="admin-product-create-step">Catalog & delivery</div>
          <p className="admin-product-create-card-hint">
            {readyDraftsCount} image{readyDraftsCount === 1 ? '' : 's'} ready to save.
            {isFlowerProduct ? ' Fine-tune sizes and prices after saving on the review page.' : ''}
          </p>
        </div>

        <fieldset className="admin-form-group">
          <legend>Pricing options</legend>
          {isFlowerProduct ? (
            <>
              <p className="admin-product-create-card-hint">
                Choose how customers pick a variant on the product page.
              </p>
              <div className="admin-product-create-choice-grid">
                {ADMIN_PRICING_TYPE_OPTIONS.map((option) => (
                  <label className="admin-product-create-choice" key={option.value}>
                    <input
                      type="radio"
                      name="create-pricing-type"
                      checked={pricingType === option.value}
                      onChange={() => setPricingType(option.value)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      {option.helper ? <small>{option.helper}</small> : null}
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="admin-product-create-card-hint">
              Non-flower products use a single price with one purchasable option (no size or stem
              tiers).
            </p>
          )}
        </fieldset>

        {isFlowerProduct ? (
          <fieldset className="admin-form-group admin-product-create-occasion-hints">
            <legend>Flower tags</legend>
            <p className="admin-product-create-card-hint">
              Select the flower types visible in this product.
            </p>
            <AdminCheckboxGrid
              idPrefix="create-flower-types"
              options={[...ADMIN_FLOWER_TYPE_OPTIONS]}
              selected={flowerTypes}
              onChange={setFlowerTypes}
            />
          </fieldset>
        ) : null}

        <fieldset className="admin-form-group admin-product-create-occasion-hints">
          <legend>Available provinces / markets</legend>
          <div className="admin-product-create-choice-grid">
            {deliveryDestinationOptions.map((option) => (
              <label className="admin-product-create-choice" key={option.value}>
                <input
                  type="checkbox"
                  checked={availableDeliveryDestinations.includes(option.value)}
                  onChange={() => onToggleDeliveryDestination(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <small>Uncheck destinations where this product should not be sold.</small>
        </fieldset>

        {isFlowerProduct ? (
          <>
            <fieldset className="admin-form-group admin-product-create-occasion-hints">
              <legend>Delivery options</legend>
              <small>Choose only one: same day, next day, or contact before order.</small>
              <AdminCheckboxGrid
                idPrefix="create-delivery-options"
                options={[...ADMIN_DELIVERY_SPEED_OPTIONS]}
                selected={deliveryOptions}
                onChange={(next) => {
                  const exclusive = exclusiveDeliverySpeedOnChange(deliveryOptions, next);
                  setDeliveryOptions(exclusive);
                  if (exclusive.length > 0) setContactBeforeOrder(false);
                }}
              />
              <label className="admin-product-create-checkbox">
                <input
                  type="checkbox"
                  checked={contactBeforeOrder}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setContactBeforeOrder(checked);
                    if (checked) setDeliveryOptions([]);
                  }}
                />
                Contact before order — customers must message LINE, WhatsApp, or email first
              </label>
            </fieldset>
            <label className="admin-product-create-checkbox">
              <input
                type="checkbox"
                checked={featuredPopular}
                onChange={(event) => setFeaturedPopular(event.target.checked)}
              />
              Show as popular on homepage
            </label>
          </>
        ) : (
          <label className="admin-product-create-checkbox">
            <input
              type="checkbox"
              checked={contactBeforeOrder}
              onChange={(event) => setContactBeforeOrder(event.target.checked)}
            />
            Contact before order — customers must message LINE, WhatsApp, or email first
          </label>
        )}

        <div className="admin-product-create-preview">
          <strong>{draft.nameEn || 'Product name'}</strong>
          <span>{price ? `THB ${price}` : 'Set a price before saving'}</span>
          <p>{draft.descriptionEn || 'Description preview will appear here.'}</p>
        </div>
      </div>

      <div className="admin-product-create-step-actions">
        <button type="button" className="admin-btn admin-btn-outline" onClick={onBack}>
          ← Back to images
        </button>
        <button
          className="admin-btn admin-btn-primary"
          type="button"
          disabled={!canSaveForReview || Boolean(loading)}
          onClick={onSave}
        >
          {loading?.kind === 'publish' ? 'Saving…' : 'Save for review'}
        </button>
      </div>
    </section>
  );
}
