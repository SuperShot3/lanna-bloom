'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { OCCASION_OPTIONS } from '@/lib/partnerPortal';
import { BOUQUET_PRESENTATION_FORMAT_OPTIONS } from '@/lib/bouquetPresentationFormats';

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

type ImageVariant = {
  assetId: string;
  url?: string;
  format: 'webp' | 'png_master';
  isPrimary: boolean;
  alt?: string;
};

type SavedProduct = {
  id: string;
  slug: string;
  reviewUrl: string;
};

type Hints = {
  productType: string;
  occasion: string;
  colors: string;
  price: string;
  size: string;
  notes: string;
};

type TextGenerationHistoryEntry = {
  id: string;
  nameEn: string;
  nameTh: string;
  generatedAt: string;
  account: string;
};

type LoadingStage = 'draft' | 'image' | 'publish';

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
  productType: 'bouquet',
  occasion: '',
  colors: '',
  price: '',
  size: '',
  notes: '',
};

const loadingStageCopy: Record<LoadingStage, { title: string; detail: string; steps: string[] }> = {
  draft: {
    title: 'Generating product text',
    detail: 'OpenAI is analyzing the photo and writing bilingual product text. This can take up to a minute.',
    steps: ['Reading product photo', 'Identifying flowers and colors', 'Writing English and Thai copy'],
  },
  image: {
    title: 'Generating product image',
    detail: 'OpenAI is preparing a clean catalog image, then the site uploads WebP and PNG versions to Sanity.',
    steps: ['Preserving product details', 'Cleaning the background', 'Uploading image variants'],
  },
  publish: {
    title: 'Saving product for review',
    detail: 'The product is being saved to Sanity as a private review item. It will not be live until approved.',
    steps: ['Checking required fields', 'Saving product in Sanity', 'Preparing review link'],
  },
};

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

function createTextGenerationHistoryId(): string {
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
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [enhancedPreview, setEnhancedPreview] = useState<string>('');
  const [hints, setHints] = useState<Hints>(emptyHints);
  const [analysis, setAnalysis] = useState<ProductImageAnalysis | null>(null);
  const [draft, setDraft] = useState<ProductDraftCopy>(emptyDraft);
  const [imageVariants, setImageVariants] = useState<ImageVariant[]>([]);
  const [price, setPrice] = useState('');
  const [colorsCsv, setColorsCsv] = useState('');
  const [flowersCsv, setFlowersCsv] = useState('');
  const [occasionsCsv, setOccasionsCsv] = useState('');
  const [presentationCsv, setPresentationCsv] = useState('bouquet');
  const [deliveryCsv, setDeliveryCsv] = useState('same_day, next_day');
  const [featuredPopular, setFeaturedPopular] = useState(false);
  const [loading, setLoading] = useState<LoadingStage | null>(null);
  const [error, setError] = useState('');
  const [savedProduct, setSavedProduct] = useState<SavedProduct | null>(null);
  const [textGenerationHistory, setTextGenerationHistory] = useState<TextGenerationHistoryEntry[]>([]);

  const canSaveForReview = useMemo(
    () => Boolean(draft.nameEn.trim() && hasPositivePrice(price) && imageVariants.some((variant) => variant.isPrimary)),
    [draft.nameEn, imageVariants, price]
  );
  const progressSteps = [
    { label: 'Upload', complete: Boolean(file) },
    { label: 'AI draft', complete: Boolean(analysis), loadingStage: 'draft' as const },
    { label: 'Image', complete: imageVariants.some((variant) => variant.isPrimary), loadingStage: 'image' as const },
    { label: 'Review', complete: Boolean(savedProduct), loadingStage: 'publish' as const },
  ];
  const loadingDetails = loading ? loadingStageCopy[loading] : null;
  const occasionHintValues = useMemo(() => splitList(hints.occasion), [hints.occasion]);

  useEffect(() => {
    setTextGenerationHistory(readTextGenerationHistory());
  }, []);

  function updateHint(key: keyof Hints, value: string) {
    setHints((current) => ({ ...current, [key]: value }));
  }

  function toggleOccasionHint(value: string) {
    const current = splitList(hints.occasion);
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    updateHint('occasion', next.join(', '));
  }

  function updateProductType(value: string) {
    updateHint('productType', value);
    setPresentationCsv(value);
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
      id: createTextGenerationHistoryId(),
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

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setFilePreview(nextFile ? URL.createObjectURL(nextFile) : '');
    setEnhancedPreview('');
    setImageVariants([]);
    setSavedProduct(null);
  }

  function resetWizard() {
    setFile(null);
    setFilePreview('');
    setEnhancedPreview('');
    setHints(emptyHints);
    setAnalysis(null);
    setDraft(emptyDraft);
    setImageVariants([]);
    setPrice('');
    setColorsCsv('');
    setFlowersCsv('');
    setOccasionsCsv('');
    setPresentationCsv('bouquet');
    setDeliveryCsv('same_day, next_day');
    setFeaturedPopular(false);
    setLoading(null);
    setError('');
    setSavedProduct(null);
  }

  async function requestDraft() {
    if (!file) {
      setError('Choose a product image first.');
      return;
    }

    setError('');
    setSavedProduct(null);
    setLoading('draft');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('hints', JSON.stringify(hints));

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
      setColorsCsv(joinList(nextAnalysis.colors));
      setFlowersCsv(joinList(nextAnalysis.identifiedFlowers));
      setOccasionsCsv(joinList(nextAnalysis.suggestedOccasions));
      setPresentationCsv(presentationFormatFromAnalysis(nextAnalysis));
      if (!price && hints.price) setPrice(hints.price);
    } catch {
      setError('Could not create the AI draft. Check your connection and try again.');
    } finally {
      setLoading(null);
    }
  }

  async function enhanceImage() {
    if (!file || !analysis) {
      setError('Create and review the AI analysis first.');
      return;
    }

    setError('');
    setLoading('image');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('approvedAnalysis', JSON.stringify(analysis));
    formData.append('alt', draft.altEn || draft.nameEn);

    try {
      const response = await fetch('/api/admin/products/enhance-image', {
        method: 'POST',
        body: formData,
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        setError(String(payload.error ?? 'Failed to enhance product image.'));
        return;
      }

      const variants = Array.isArray(payload.variants) ? (payload.variants as ImageVariant[]) : [];
      const previews = payload.previews as { webp?: string } | undefined;
      setImageVariants(variants);
      setEnhancedPreview(previews?.webp || variants.find((variant) => variant.isPrimary)?.url || '');
    } catch {
      setError('Could not enhance and upload the product image. Check your connection and try again.');
    } finally {
      setLoading(null);
    }
  }

  async function saveProductForReview() {
    if (!hasPositivePrice(price)) {
      setError('Enter a product price greater than 0 before saving for review.');
      return;
    }

    setError('');
    setLoading('publish');
    try {
      const response = await fetch('/api/admin/products/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          price,
          images: imageVariants.map((variant) => ({
            ...variant,
            alt: variant.alt || draft.altEn || draft.nameEn,
          })),
          colors: splitList(colorsCsv),
          flowerTypes: splitList(flowersCsv),
          occasion: splitList(occasionsCsv),
          presentationFormats: splitList(presentationCsv),
          deliveryOptions: splitList(deliveryCsv),
          featuredPopular,
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
        reviewUrl: String(payload.reviewUrl || `/admin/products/review/${payload.id}`),
      });
    } catch {
      setError('Could not save this product for review. Check your connection and try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="admin-orders admin-product-create">
      <header className="admin-product-create-hero">
        <div>
          <span className="admin-product-create-eyebrow">Admin product studio</span>
          <h1 className="admin-title">Create Product With AI</h1>
          <p className="admin-hint">
            Upload one product photo, review every AI suggestion, then save a private Sanity draft for owner/admin approval.
          </p>
        </div>
        <div className="admin-product-create-user">
          <span className="material-symbols-outlined admin-product-create-user-icon">verified_user</span>
          {adminEmail}
        </div>
      </header>

      <div className="admin-product-create-progress" aria-label="Product creation progress">
        {progressSteps.map((step, index) => (
          <div
            key={step.label}
            className={`admin-product-create-progress-step ${step.complete ? 'is-complete' : ''} ${
              loading && step.loadingStage === loading ? 'is-active' : ''
            }`}
          >
            <span>{loading && step.loadingStage === loading ? '...' : step.complete ? 'OK' : index + 1}</span>
            {step.label}
          </div>
        ))}
      </div>

      {loadingDetails ? (
        <div className="admin-product-create-loading" role="status" aria-live="polite">
          <div className="admin-product-create-loader" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>{loadingDetails.title}</strong>
            <p>{loadingDetails.detail}</p>
            <div className="admin-product-create-loading-steps">
              {loadingDetails.steps.map((step) => (
                <span key={step}>{step}</span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

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
          <h2>Product is in Sanity but not live</h2>
          <p>
            This bouquet is hidden from the public catalog until an owner or admin approves it. Share the internal review
            page with the team when it is ready.
          </p>
          <dl className="admin-product-create-result-meta">
            <div>
              <dt>Sanity ID</dt>
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
            <Link className="admin-btn admin-btn-outline" href="/admin/moderation/products">
              View moderation queue
            </Link>
            <button className="admin-btn admin-btn-outline" type="button" onClick={resetWizard}>
              Create another product
            </button>
          </div>
        </section>
      ) : (
        <>
      <section className="admin-product-create-grid">
        <div className="admin-product-create-card">
          <div>
            <div className="admin-product-create-step">1. Upload and hints</div>
            <p className="admin-product-create-card-hint">Start with the clearest front photo. JPEG, PNG, and WebP are accepted.</p>
          </div>
          <label className="admin-product-create-upload">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />
            {filePreview ? (
              <img className="admin-product-create-image" src={filePreview} alt="Selected product preview" />
            ) : (
              <span className="admin-product-create-upload-empty">
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <strong>Choose product photo</strong>
                <small>Tap to open camera roll on iPhone</small>
              </span>
            )}
          </label>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Product type</span>
              <select
                className="admin-input"
                value={hints.productType}
                onChange={(event) => updateProductType(event.target.value)}
              >
                {BOUQUET_PRESENTATION_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-form-group">
              <span>Target price</span>
              <input
                className="admin-input"
                inputMode="decimal"
                value={hints.price}
                onChange={(event) => updateHint('price', event.target.value)}
              />
              <small>Product price only. Exclude delivery.</small>
            </label>
          </div>
          <div className="admin-product-create-two">
            <fieldset className="admin-form-group admin-product-create-occasion-hints">
              <legend>Occasion hint</legend>
              <div className="admin-product-create-choice-grid">
                {OCCASION_OPTIONS.map((option) => (
                  <label className="admin-product-create-choice" key={option.value}>
                    <input
                      type="checkbox"
                      checked={occasionHintValues.includes(option.value)}
                      onChange={() => toggleOccasionHint(option.value)}
                    />
                    <span>{option.labelEn}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="admin-form-group">
              <span>Color hint</span>
              <input
                className="admin-input"
                value={hints.colors}
                onChange={(event) => updateHint('colors', event.target.value)}
              />
            </label>
          </div>
          <label className="admin-form-group">
            <span>AI notes</span>
            <textarea
              className="admin-input admin-product-create-textarea"
              value={hints.notes}
              onChange={(event) => updateHint('notes', event.target.value)}
              placeholder="Example: preserve the basket, write for birthday and congratulations shoppers"
            />
          </label>
          <button className="admin-btn admin-btn-primary admin-product-create-main-action" type="button" disabled={Boolean(loading)} onClick={requestDraft}>
            <span className="material-symbols-outlined" aria-hidden="true">
              auto_awesome
            </span>
            {loading === 'draft' ? 'Generating text...' : 'Generate text'}
          </button>
        </div>

        <div className="admin-product-create-card">
          <div>
            <div className="admin-product-create-step">2. Review analysis</div>
            <p className="admin-product-create-card-hint">Correct flower names or uncertain items before generating the final product image.</p>
          </div>
          {analysis ? (
            <>
              <label className="admin-form-group">
                <span>Visible flowers</span>
                <input
                  className="admin-input"
                  value={joinList(analysis.identifiedFlowers)}
                  onChange={(event) => updateAnalysis('identifiedFlowers', event.target.value)}
                />
              </label>
              <label className="admin-form-group">
                <span>Colors</span>
                <input
                  className="admin-input"
                  value={joinList(analysis.colors)}
                  onChange={(event) => updateAnalysis('colors', event.target.value)}
                />
              </label>
              <label className="admin-form-group">
                <span>Format and container</span>
                <input
                  className="admin-input"
                  value={`${analysis.productFormat} - ${analysis.wrappingOrContainer}`}
                  onChange={(event) => updateAnalysis('productFormat', event.target.value)}
                />
              </label>
              <label className="admin-form-group">
                <span>Uncertain items</span>
                <input
                  className="admin-input"
                  value={joinList(analysis.uncertainItems)}
                  onChange={(event) => updateAnalysis('uncertainItems', event.target.value)}
                />
              </label>
              <p className="admin-product-create-note">{analysis.rawSummary || analysis.confidenceNotes}</p>
              <button
                className="admin-btn admin-btn-primary admin-product-create-main-action"
                type="button"
                disabled={Boolean(loading)}
                onClick={enhanceImage}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  image
                </span>
                {loading === 'image' ? 'Generating image...' : 'Generate image'}
              </button>
            </>
          ) : (
            <>
              <p className="admin-hint">Generate text first. The AI analysis will appear here for review before image generation.</p>
              <button
                className="admin-btn admin-btn-primary admin-product-create-main-action"
                type="button"
                disabled
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  image
                </span>
                Generate image
              </button>
            </>
          )}
        </div>
      </section>

      <section className="admin-product-create-grid">
        <div className="admin-product-create-card">
          <div>
            <div className="admin-product-create-step">3. Review bilingual copy</div>
            <p className="admin-product-create-card-hint">Edit the English and Thai copy exactly as it should appear to customers.</p>
          </div>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Name EN</span>
              <input className="admin-input" value={draft.nameEn} onChange={(event) => updateDraft('nameEn', event.target.value)} />
            </label>
            <label className="admin-form-group">
              <span>Name TH</span>
              <input className="admin-input" value={draft.nameTh} onChange={(event) => updateDraft('nameTh', event.target.value)} />
            </label>
          </div>
          <label className="admin-form-group">
            <span>Description EN</span>
            <textarea
              className="admin-input admin-product-create-textarea"
              value={draft.descriptionEn}
              onChange={(event) => updateDraft('descriptionEn', event.target.value)}
            />
          </label>
          <label className="admin-form-group">
            <span>Description TH</span>
            <textarea
              className="admin-input admin-product-create-textarea"
              value={draft.descriptionTh}
              onChange={(event) => updateDraft('descriptionTh', event.target.value)}
            />
          </label>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Composition EN</span>
              <input
                className="admin-input"
                value={draft.compositionEn}
                onChange={(event) => updateDraft('compositionEn', event.target.value)}
              />
            </label>
            <label className="admin-form-group">
              <span>Composition TH</span>
              <input
                className="admin-input"
                value={draft.compositionTh}
                onChange={(event) => updateDraft('compositionTh', event.target.value)}
              />
            </label>
          </div>
          <label className="admin-form-group">
            <span>Image alt text</span>
            <input className="admin-input" value={draft.altEn} onChange={(event) => updateDraft('altEn', event.target.value)} />
          </label>
        </div>

        <div className="admin-product-create-card">
          <div>
            <div className="admin-product-create-step">4. Review details and save</div>
            <p className="admin-product-create-card-hint">Confirm price, tags, and the approved image before saving for review.</p>
          </div>
          {enhancedPreview ? (
            <img className="admin-product-create-image" src={enhancedPreview} alt="Enhanced product preview" />
          ) : (
            <p className="admin-hint">Enhanced WebP preview appears after image approval.</p>
          )}
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Price THB</span>
              <input className="admin-input" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} />
            </label>
            <label className="admin-form-group">
              <span>Presentation formats</span>
              <input className="admin-input" value={presentationCsv} onChange={(event) => setPresentationCsv(event.target.value)} />
            </label>
          </div>
          <label className="admin-form-group">
            <span>Color tags</span>
            <input className="admin-input" value={colorsCsv} onChange={(event) => setColorsCsv(event.target.value)} />
          </label>
          <label className="admin-form-group">
            <span>Flower tags</span>
            <input className="admin-input" value={flowersCsv} onChange={(event) => setFlowersCsv(event.target.value)} />
          </label>
          <label className="admin-form-group">
            <span>Occasion tags</span>
            <input className="admin-input" value={occasionsCsv} onChange={(event) => setOccasionsCsv(event.target.value)} />
          </label>
          <label className="admin-form-group">
            <span>Delivery options</span>
            <input className="admin-input" value={deliveryCsv} onChange={(event) => setDeliveryCsv(event.target.value)} />
          </label>
          <label className="admin-product-create-checkbox">
            <input
              type="checkbox"
              checked={featuredPopular}
              onChange={(event) => setFeaturedPopular(event.target.checked)}
            />
            Show as popular on homepage
          </label>
          <div className="admin-product-create-preview">
            <strong>{draft.nameEn || 'Product name'}</strong>
            <span>{price ? `THB ${price}` : 'Set a price before saving'}</span>
            <p>{draft.descriptionEn || 'Description preview will appear here.'}</p>
          </div>
          <button
            className="admin-btn admin-btn-primary admin-btn-full"
            type="button"
            disabled={!canSaveForReview || Boolean(loading)}
            onClick={saveProductForReview}
          >
            {loading === 'publish' ? 'Saving...' : 'Save for Review'}
          </button>
        </div>
      </section>
        </>
      )}
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
