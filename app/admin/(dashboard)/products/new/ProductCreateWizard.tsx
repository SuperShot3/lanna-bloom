'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

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

type PublishedProduct = {
  id: string;
  slug: string;
};

type Hints = {
  productType: string;
  occasion: string;
  colors: string;
  price: string;
  size: string;
  notes: string;
};

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

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter(Boolean);
}

function joinList(value: string[] | undefined): string {
  return (value ?? []).join(', ');
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
  const [loading, setLoading] = useState<'draft' | 'image' | 'publish' | null>(null);
  const [error, setError] = useState('');
  const [published, setPublished] = useState<PublishedProduct | null>(null);

  const canPublish = useMemo(
    () => Boolean(draft.nameEn.trim() && price && imageVariants.some((variant) => variant.isPrimary)),
    [draft.nameEn, imageVariants, price]
  );

  function updateHint(key: keyof Hints, value: string) {
    setHints((current) => ({ ...current, [key]: value }));
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

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setFilePreview(nextFile ? URL.createObjectURL(nextFile) : '');
    setEnhancedPreview('');
    setImageVariants([]);
    setPublished(null);
  }

  async function requestDraft() {
    if (!file) {
      setError('Choose a product image first.');
      return;
    }

    setError('');
    setPublished(null);
    setLoading('draft');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('hints', JSON.stringify(hints));

    const response = await fetch('/api/admin/products/ai-draft', {
      method: 'POST',
      body: formData,
    });
    const payload = await readJsonResponse(response);
    setLoading(null);

    if (!response.ok) {
      setError(String(payload.error ?? 'Failed to create AI draft.'));
      return;
    }

    const nextAnalysis = payload.analysis as ProductImageAnalysis;
    const nextDraft = payload.draft as ProductDraftCopy;
    setAnalysis(nextAnalysis);
    setDraft(nextDraft);
    setColorsCsv(joinList(nextAnalysis.colors));
    setFlowersCsv(joinList(nextAnalysis.identifiedFlowers));
    setOccasionsCsv(joinList(nextAnalysis.suggestedOccasions));
    setPresentationCsv(presentationFormatFromAnalysis(nextAnalysis));
    if (!price && hints.price) setPrice(hints.price);
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

    const response = await fetch('/api/admin/products/enhance-image', {
      method: 'POST',
      body: formData,
    });
    const payload = await readJsonResponse(response);
    setLoading(null);

    if (!response.ok) {
      setError(String(payload.error ?? 'Failed to enhance product image.'));
      return;
    }

    const variants = Array.isArray(payload.variants) ? (payload.variants as ImageVariant[]) : [];
    const previews = payload.previews as { webp?: string } | undefined;
    setImageVariants(variants);
    setEnhancedPreview(previews?.webp || variants.find((variant) => variant.isPrimary)?.url || '');
  }

  async function publishProduct() {
    setError('');
    setLoading('publish');
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
    setLoading(null);

    if (!response.ok) {
      setError(String(payload.error ?? 'Failed to publish product.'));
      return;
    }

    setPublished({ id: String(payload.id), slug: String(payload.slug) });
  }

  return (
    <div className="admin-orders admin-product-create">
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Create Product With AI</h1>
          <p className="admin-hint">
            Upload an image, review AI analysis and copy, approve the enhanced image, then publish to Sanity.
          </p>
        </div>
        <div className="admin-header-actions">
          <span className="admin-product-create-user">Publishing as {adminEmail}</span>
        </div>
      </header>

      {error ? <div className="admin-product-create-alert">{error}</div> : null}
      {published ? (
        <div className="admin-product-create-success">
          Product published. View it in{' '}
          <Link href={`/en/catalog/${published.slug}`} target="_blank">
            English catalog
          </Link>{' '}
          or{' '}
          <Link href={`/th/catalog/${published.slug}`} target="_blank">
            Thai catalog
          </Link>
          .
        </div>
      ) : null}

      <section className="admin-product-create-grid">
        <div className="admin-product-create-card">
          <div className="admin-product-create-step">1. Upload and hints</div>
          <label className="admin-form-group">
            <span>Product image</span>
            <input
              className="admin-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />
          </label>
          {filePreview ? (
            <img className="admin-product-create-image" src={filePreview} alt="Selected product preview" />
          ) : null}
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Product type</span>
              <input
                className="admin-input"
                value={hints.productType}
                onChange={(event) => updateHint('productType', event.target.value)}
              />
            </label>
            <label className="admin-form-group">
              <span>Target price</span>
              <input
                className="admin-input"
                inputMode="decimal"
                value={hints.price}
                onChange={(event) => updateHint('price', event.target.value)}
              />
            </label>
          </div>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Occasion hint</span>
              <input
                className="admin-input"
                value={hints.occasion}
                onChange={(event) => updateHint('occasion', event.target.value)}
              />
            </label>
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
          <button className="admin-btn admin-btn-primary" type="button" disabled={loading === 'draft'} onClick={requestDraft}>
            {loading === 'draft' ? 'Generating draft...' : 'Analyze Image And Generate Copy'}
          </button>
        </div>

        <div className="admin-product-create-card">
          <div className="admin-product-create-step">2. Review analysis</div>
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
                className="admin-btn admin-btn-primary"
                type="button"
                disabled={loading === 'image'}
                onClick={enhanceImage}
              >
                {loading === 'image' ? 'Enhancing and uploading...' : 'Enhance Image And Upload Variants'}
              </button>
            </>
          ) : (
            <p className="admin-hint">AI analysis will appear here for admin correction before image enhancement.</p>
          )}
        </div>
      </section>

      <section className="admin-product-create-grid">
        <div className="admin-product-create-card">
          <div className="admin-product-create-step">3. Review bilingual copy</div>
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
          <div className="admin-product-create-step">4. Publish details and preview</div>
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
            <span>{price ? `THB ${price}` : 'Set a price before publishing'}</span>
            <p>{draft.descriptionEn || 'Description preview will appear here.'}</p>
          </div>
          <button
            className="admin-btn admin-btn-primary admin-btn-full"
            type="button"
            disabled={!canPublish || loading === 'publish'}
            onClick={publishProduct}
          >
            {loading === 'publish' ? 'Publishing...' : 'Publish Approved Product'}
          </button>
        </div>
      </section>
    </div>
  );
}
