'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProductImageUploadOptions } from '@/app/admin/components/cms-editor/ProductImageListEditor';
import {
  AdminCmsCollapsibleSection,
  AdminCmsEditor,
  AdminCmsSection,
  AdminCheckboxGrid,
  PricingSectionEditor,
  ProductImageListEditor,
} from '@/app/admin/components/cms-editor';
import { reorderImagesByIds } from '@/lib/catalogImageReorder';
import {
  ensureFourSizeSlots,
  normalizePricingJson,
  pricingPayloadForSave,
  type CatalogSizePricingRow,
  type CatalogStemPricingRow,
  type PricingType,
} from '@/lib/catalog/pricing';
import type { AdminBouquetDetail, AdminCatalogProductImage } from '@/lib/catalog/types';
import type { BouquetStatus } from '@/lib/bouquets';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import {
  ADMIN_COLOR_OPTIONS,
  ADMIN_DELIVERY_SPEED_OPTIONS,
  ADMIN_FLOWER_TYPE_OPTIONS,
  ADMIN_FORMAT_OPTIONS,
  ADMIN_MARKET_OPTIONS,
  ADMIN_OCCASION_OPTIONS,
  availableMarketsFromExcluded,
  excludedMarketsFromAvailable,
} from '@/lib/catalogAdminFieldOptions';
import { confirmCatalogDeleteAction } from '@/app/admin/components/confirmDelete';
import { useCatalogShelfDirty } from '@/app/admin/(dashboard)/products/CatalogShelfDirtyContext';
import { useCatalogUnsavedLeaveGuard } from '@/app/admin/(dashboard)/products/useCatalogUnsavedLeaveGuard';
import {
  approveBouquetFromStudioAction,
  convertBouquetImageToWebpAction,
  deleteBouquetFromStudioAction,
  deleteBouquetImageAction,
  editBouquetImageFramingAction,
  publishBouquetDraftAction,
  reorderBouquetImagesAction,
  unpublishBouquetFromStudioAction,
  updateBouquetByAdminAction,
  updateBouquetImageAltAction,
  uploadBouquetImageAction,
} from '../actions';

const GPT_ITEM_CARD_URL =
  'https://chatgpt.com/g/g-6a1819eb5c9081919d025d2329c63bdb-kartochka-tovara';

const STATUS_LABELS: Record<BouquetStatus, string> = {
  pending_review: 'Pending review',
  approved: 'Live',
  rejected: 'Rejected',
};

type Props = { bouquet: AdminBouquetDetail };

function initialPricingState(bouquet: AdminBouquetDetail) {
  const pricingType = bouquet.pricingType ?? 'single_price';
  const normalized = normalizePricingJson(pricingType, bouquet.pricing ?? {});
  return {
    pricingType,
    singlePrice: String(
      normalized.price ?? bouquet.pricing?.price ?? bouquet.sizes[0]?.price ?? 0
    ),
    sizeRows: ensureFourSizeSlots(normalized.sizes ?? []),
    stemOptions: normalized.stemOptions ?? [],
  };
}

export function AdminBouquetDetailClient({ bouquet }: Props) {
  const router = useRouter();
  const { getBouquetPending, setBouquetPending } = useCatalogShelfDirty();

  const serverPricing = useMemo(() => initialPricingState(bouquet), [bouquet]);
  const pending = getBouquetPending(bouquet.id);

  const [nameEn, setNameEn] = useState(() => pending?.nameEn ?? bouquet.nameEn);
  const [nameTh, setNameTh] = useState(() => pending?.nameTh ?? bouquet.nameTh);
  const [descriptionEn, setDescriptionEn] = useState(
    () => pending?.descriptionEn ?? bouquet.descriptionEn
  );
  const [descriptionTh, setDescriptionTh] = useState(
    () => pending?.descriptionTh ?? bouquet.descriptionTh
  );
  const [compositionEn, setCompositionEn] = useState(
    () => pending?.compositionEn ?? bouquet.compositionEn
  );
  const [compositionTh, setCompositionTh] = useState(
    () => pending?.compositionTh ?? bouquet.compositionTh
  );
  const [pricingType, setPricingType] = useState<PricingType>(
    () => pending?.pricingType ?? serverPricing.pricingType
  );
  const [singlePrice, setSinglePrice] = useState(
    () => pending?.singlePrice ?? serverPricing.singlePrice
  );
  const [sizeRows, setSizeRows] = useState<CatalogSizePricingRow[]>(
    () => pending?.sizeRows ?? serverPricing.sizeRows
  );
  const [stemOptions, setStemOptions] = useState<CatalogStemPricingRow[]>(
    () => pending?.stemOptions ?? serverPricing.stemOptions
  );
  const [discountPercent, setDiscountPercent] = useState(
    () => pending?.discountPercent ?? (bouquet.discountPercent != null ? String(bouquet.discountPercent) : '')
  );
  const [featuredPopular, setFeaturedPopular] = useState(
    () => pending?.featuredPopular ?? bouquet.featuredPopular
  );
  const [deliveryOptions, setDeliveryOptions] = useState<string[]>(
    () => pending?.deliveryOptions ?? bouquet.deliveryOptions ?? []
  );
  const [availableMarkets, setAvailableMarkets] = useState<DeliveryDestinationId[]>(
    () =>
      pending?.availableMarkets ??
      availableMarketsFromExcluded(bouquet.excludedDeliveryDestinations)
  );
  const [presentationFormats, setPresentationFormats] = useState<string[]>(
    () => pending?.presentationFormats ?? bouquet.presentationFormats ?? []
  );
  const [colors, setColors] = useState<string[]>(() => pending?.colors ?? bouquet.colors ?? []);
  const [flowerTypes, setFlowerTypes] = useState<string[]>(
    () => pending?.flowerTypes ?? bouquet.flowerTypes ?? []
  );
  const [occasion, setOccasion] = useState<string[]>(() => pending?.occasion ?? bouquet.occasion ?? []);
  const [editableImages, setEditableImages] = useState<AdminCatalogProductImage[]>(
    bouquet.editableImages ?? []
  );
  const [status, setStatus] = useState<BouquetStatus>(bouquet.status);
  const [loading, setLoading] = useState<string | null>(null);
  const [savingImageOrder, setSavingImageOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (getBouquetPending(bouquet.id)) return;
    setNameEn(bouquet.nameEn);
    setNameTh(bouquet.nameTh);
    setDescriptionEn(bouquet.descriptionEn);
    setDescriptionTh(bouquet.descriptionTh);
    setCompositionEn(bouquet.compositionEn);
    setCompositionTh(bouquet.compositionTh);
    const next = initialPricingState(bouquet);
    setPricingType(next.pricingType);
    setSinglePrice(next.singlePrice);
    setSizeRows(next.sizeRows);
    setStemOptions(next.stemOptions);
    setDiscountPercent(bouquet.discountPercent != null ? String(bouquet.discountPercent) : '');
    setFeaturedPopular(bouquet.featuredPopular);
    setDeliveryOptions(bouquet.deliveryOptions ?? []);
    setAvailableMarkets(availableMarketsFromExcluded(bouquet.excludedDeliveryDestinations));
    setPresentationFormats(bouquet.presentationFormats ?? []);
    setColors(bouquet.colors ?? []);
    setFlowerTypes(bouquet.flowerTypes ?? []);
    setOccasion(bouquet.occasion ?? []);
    setStatus(bouquet.status);
    setEditableImages(bouquet.editableImages ?? []);
  }, [bouquet, getBouquetPending]);

  const catalogHref = `/en/catalog/${bouquet.slug}`;
  const isLiveOnSite = status === 'approved';
  const usesDraftWorkflow = isLiveOnSite;

  const formFingerprint = useMemo(
    () =>
      JSON.stringify({
        nameEn,
        nameTh,
        descriptionEn,
        descriptionTh,
        compositionEn,
        compositionTh,
        pricingType,
        singlePrice,
        sizeRows,
        stemOptions,
        discountPercent,
        featuredPopular,
        deliveryOptions,
        availableMarkets,
        presentationFormats,
        colors,
        flowerTypes,
        occasion,
      }),
    [
      nameEn,
      nameTh,
      descriptionEn,
      descriptionTh,
      compositionEn,
      compositionTh,
      pricingType,
      singlePrice,
      sizeRows,
      stemOptions,
      discountPercent,
      featuredPopular,
      deliveryOptions,
      availableMarkets,
      presentationFormats,
      colors,
      flowerTypes,
      occasion,
    ]
  );

  const savedFingerprint = useMemo(
    () =>
      JSON.stringify({
        nameEn: bouquet.nameEn,
        nameTh: bouquet.nameTh,
        descriptionEn: bouquet.descriptionEn,
        descriptionTh: bouquet.descriptionTh,
        compositionEn: bouquet.compositionEn,
        compositionTh: bouquet.compositionTh,
        pricingType: bouquet.pricingType,
        singlePrice: serverPricing.singlePrice,
        sizeRows: serverPricing.sizeRows,
        stemOptions: serverPricing.stemOptions,
        discountPercent: bouquet.discountPercent != null ? String(bouquet.discountPercent) : '',
        featuredPopular: bouquet.featuredPopular,
        deliveryOptions: bouquet.deliveryOptions ?? [],
        availableMarkets: availableMarketsFromExcluded(bouquet.excludedDeliveryDestinations),
        presentationFormats: bouquet.presentationFormats ?? [],
        colors: bouquet.colors ?? [],
        flowerTypes: bouquet.flowerTypes ?? [],
        occasion: bouquet.occasion ?? [],
      }),
    [bouquet, serverPricing]
  );

  const hasUnsavedChanges = formFingerprint !== savedFingerprint;

  const handleImageReorder = useCallback(
    async (variantKey: string | null, orderedIds: string[]) => {
      let previous: AdminCatalogProductImage[] = [];
      setEditableImages((current) => {
        previous = current;
        try {
          return reorderImagesByIds(current, orderedIds, variantKey);
        } catch {
          return current;
        }
      });
      setSavingImageOrder(true);
      const result = await reorderBouquetImagesAction(bouquet.id, orderedIds, variantKey);
      setSavingImageOrder(false);
      if (result.error) {
        setEditableImages(previous);
        setError(result.error);
      }
    },
    [bouquet.id]
  );

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setLoading('save');

    const formData = new FormData();
    formData.set('bouquetId', bouquet.id);
    formData.set('nameEn', nameEn);
    formData.set('nameTh', nameTh);
    formData.set('descriptionEn', descriptionEn);
    formData.set('descriptionTh', descriptionTh);
    formData.set('compositionEn', compositionEn);
    formData.set('compositionTh', compositionTh);
    formData.set('pricingType', pricingType);
    formData.set('singlePrice', singlePrice);
    formData.set('sizeRows', JSON.stringify(sizeRows));
    formData.set('stemOptions', JSON.stringify(stemOptions));
    formData.set('discountPercent', discountPercent);
    formData.set('featuredPopular', featuredPopular ? 'true' : 'false');
    formData.set(
      'excludedDeliveryDestinations',
      JSON.stringify(excludedMarketsFromAvailable(availableMarkets))
    );
    formData.set('colors', colors.join(', '));
    formData.set('flowerTypes', flowerTypes.join(', '));
    formData.set('occasion', occasion.join(', '));
    formData.set('presentationFormats', presentationFormats.join(', '));
    formData.set('deliveryOptions', deliveryOptions.join(', '));

    const result = await updateBouquetByAdminAction(formData);
    setLoading(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBouquetPending(bouquet.id, null);
    setSuccess(usesDraftWorkflow ? 'Draft saved on server' : 'Saved');
    router.refresh();
  }

  async function handlePublish() {
    if (!bouquet.draftRevisionId) return;
    setError(null);
    setSuccess(null);
    setLoading('publish');
    const result = await publishBouquetDraftAction(bouquet.id, bouquet.draftRevisionId);
    setLoading(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBouquetPending(bouquet.id, null);
    setSuccess('Published to website');
    router.refresh();
  }

  async function handleApprove() {
    setError(null);
    setSuccess(null);
    setLoading('approve');
    const result = await approveBouquetFromStudioAction(bouquet.id);
    setLoading(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus('approved');
    setSuccess('Approved and live in catalog');
    router.refresh();
  }

  async function handleUnpublish() {
    if (!window.confirm('Unpublish this bouquet from the website?')) return;
    setError(null);
    setSuccess(null);
    setLoading('unpublish');
    const result = await unpublishBouquetFromStudioAction(bouquet.id);
    setLoading(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus('pending_review');
    setSuccess('Unpublished (not live)');
    router.refresh();
  }

  async function handleDelete() {
    const label = nameEn.trim() || bouquet.nameEn;
    if (!confirmCatalogDeleteAction(label)) return;
    setError(null);
    setSuccess(null);
    setLoading('delete');
    const result = await deleteBouquetFromStudioAction(bouquet.id);
    setLoading(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push('/admin/products');
    router.refresh();
  }

  const imageHandlers = {
    loadingKey: loading,
    onReorder: handleImageReorder,
    onUpload: async (variantKey: string | null, file: File, options?: ProductImageUploadOptions) => {
      setLoading('upload');
      const formData = new FormData();
      formData.set('bouquetId', bouquet.id);
      formData.set('file', file);
      formData.set('altEn', nameEn);
      formData.set('altTh', nameTh);
      if (variantKey) formData.set('variantKey', variantKey);
      if (options?.convertToWebp) formData.set('convertToWebp', '1');
      const result = await uploadBouquetImageAction(formData);
      setLoading(null);
      if (result.error) setError(result.error);
      else router.refresh();
    },
    onSaveAlt: async (image: AdminCatalogProductImage) => {
      setLoading(`alt-${image.id}`);
      const formData = new FormData();
      formData.set('bouquetId', bouquet.id);
      formData.set('imageId', image.id);
      formData.set('altEn', image.altEn);
      formData.set('altTh', image.altTh);
      const result = await updateBouquetImageAltAction(formData);
      setLoading(null);
      if (result.error) setError(result.error);
      else router.refresh();
    },
    onReplace: async (imageId: string, file: File, options?: ProductImageUploadOptions) => {
      const image = editableImages.find((i) => i.id === imageId);
      if (!image) return;
      setLoading('replace');
      const formData = new FormData();
      formData.set('bouquetId', bouquet.id);
      formData.set('file', file);
      formData.set('altEn', image.altEn || nameEn);
      formData.set('altTh', image.altTh || nameTh);
      if (image.variantKey) formData.set('variantKey', image.variantKey);
      if (options?.convertToWebp) formData.set('convertToWebp', '1');
      const upload = await uploadBouquetImageAction(formData);
      if (upload.error) {
        setLoading(null);
        setError(upload.error);
        return;
      }
      const del = await deleteBouquetImageAction(bouquet.id, imageId);
      setLoading(null);
      if (del.error) setError(del.error);
      else router.refresh();
    },
    onConvertToWebp: async (imageId: string) => {
      setLoading(`convert-${imageId}`);
      const formData = new FormData();
      formData.set('bouquetId', bouquet.id);
      formData.set('imageId', imageId);
      const result = await convertBouquetImageToWebpAction(formData);
      setLoading(null);
      if (result.error) setError(result.error);
      else router.refresh();
    },
    onEditFraming: async (imageId: string, file: File) => {
      setLoading(`framing-${imageId}`);
      const formData = new FormData();
      formData.set('bouquetId', bouquet.id);
      formData.set('imageId', imageId);
      formData.set('file', file);
      const result = await editBouquetImageFramingAction(formData);
      setLoading(null);
      if (result.error) setError(result.error);
      else router.refresh();
    },
    onRemove: async (imageId: string) => {
      if (!window.confirm('Remove this image?')) return;
      setLoading(`delete-${imageId}`);
      const result = await deleteBouquetImageAction(bouquet.id, imageId);
      setLoading(null);
      if (result.error) setError(result.error);
      else router.refresh();
    },
  };

  const statusClass =
    status === 'approved' ? 'is-live' : status === 'rejected' ? 'is-rejected' : 'is-pending';

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setBouquetPending(bouquet.id, null);
      return;
    }
    setBouquetPending(bouquet.id, {
      nameEn,
      nameTh,
      descriptionEn,
      descriptionTh,
      compositionEn,
      compositionTh,
      pricingType,
      singlePrice,
      sizeRows,
      stemOptions,
      discountPercent,
      featuredPopular,
      deliveryOptions,
      availableMarkets,
      presentationFormats,
      colors,
      flowerTypes,
      occasion,
    });
  }, [
    hasUnsavedChanges,
    bouquet.id,
    setBouquetPending,
    nameEn,
    nameTh,
    descriptionEn,
    descriptionTh,
    compositionEn,
    compositionTh,
    pricingType,
    singlePrice,
    sizeRows,
    stemOptions,
    discountPercent,
    featuredPopular,
    deliveryOptions,
    availableMarkets,
    presentationFormats,
    colors,
    flowerTypes,
    occasion,
  ]);

  useCatalogUnsavedLeaveGuard(hasUnsavedChanges);

  return (
    <AdminCmsEditor>
      <div className="admin-cms-toolbar">
        <div className="admin-cms-toolbar-meta">
          <span className={`admin-cms-status ${statusClass}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
          <span className="admin-cms-slug-hint">
            {bouquet.slug} · {bouquet.id.slice(0, 8)}…
          </span>
          {savingImageOrder ? (
            <span className="admin-cms-slug-hint">Saving order…</span>
          ) : null}
        </div>
        <div className="admin-cms-toolbar-actions">
          <button
            type="button"
            className="admin-cms-btn admin-cms-btn-primary"
            disabled={!!loading}
            onClick={handleSave}
          >
            {loading === 'save'
              ? 'Saving…'
              : usesDraftWorkflow
                ? 'Save draft'
                : 'Save changes'}
          </button>
          {usesDraftWorkflow && bouquet.hasDraft ? (
            <button
              type="button"
              className="admin-cms-btn admin-cms-btn-outline admin-cms-btn-publish"
              disabled={!!loading || hasUnsavedChanges}
              title={
                hasUnsavedChanges
                  ? 'Save draft first, then publish'
                  : 'Push draft to the public catalog'
              }
              onClick={handlePublish}
            >
              {loading === 'publish' ? 'Publishing…' : 'Publish to website'}
            </button>
          ) : null}
          {status !== 'approved' ? (
            <button
              type="button"
              className="admin-cms-btn admin-cms-btn-outline"
              disabled={!!loading}
              onClick={handleApprove}
            >
              Approve & live
            </button>
          ) : null}
          {status === 'approved' ? (
            <button
              type="button"
              className="admin-cms-btn admin-cms-btn-outline"
              disabled={!!loading}
              onClick={handleUnpublish}
            >
              {loading === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}
            </button>
          ) : null}
          {status === 'approved' && !bouquet.hasDraft ? (
            <Link className="admin-cms-btn admin-cms-btn-outline" href={catalogHref} target="_blank">
              View catalog
            </Link>
          ) : null}
          <a
            className="admin-cms-btn admin-cms-btn-outline"
            href={GPT_ITEM_CARD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Create item card (GPT)
          </a>
          <button
            type="button"
            className="admin-cms-btn admin-cms-btn-danger"
            disabled={!!loading}
            onClick={handleDelete}
          >
            {loading === 'delete' ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {error ? <div className="admin-cms-alert is-error">{error}</div> : null}
      {success ? <div className="admin-cms-alert is-success">{success}</div> : null}

      <AdminCmsSection label="Copy">
        <label className="admin-cms-field">
          <span className="admin-cms-field-label">Name (EN)</span>
          <input className="admin-cms-input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        </label>
        <label className="admin-cms-field">
          <span className="admin-cms-field-label">Name (TH)</span>
          <input className="admin-cms-input" value={nameTh} onChange={(e) => setNameTh(e.target.value)} />
        </label>
        <label className="admin-cms-field">
          <span className="admin-cms-field-label">Description (EN)</span>
          <textarea
            className="admin-cms-input"
            rows={3}
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
          />
        </label>
        <label className="admin-cms-field">
          <span className="admin-cms-field-label">Description (TH)</span>
          <textarea
            className="admin-cms-input"
            rows={3}
            value={descriptionTh}
            onChange={(e) => setDescriptionTh(e.target.value)}
          />
        </label>
        <label className="admin-cms-field">
          <span className="admin-cms-field-label">Composition (EN)</span>
          <textarea
            className="admin-cms-input"
            rows={2}
            value={compositionEn}
            onChange={(e) => setCompositionEn(e.target.value)}
          />
        </label>
        <label className="admin-cms-field">
          <span className="admin-cms-field-label">Composition (TH)</span>
          <textarea
            className="admin-cms-input"
            rows={2}
            value={compositionTh}
            onChange={(e) => setCompositionTh(e.target.value)}
          />
        </label>
      </AdminCmsSection>

      <PricingSectionEditor
        pricingType={pricingType}
        onPricingTypeChange={setPricingType}
        singlePrice={singlePrice}
        onSinglePriceChange={setSinglePrice}
        sizeRows={sizeRows}
        onSizeRowsChange={setSizeRows}
        stemOptions={stemOptions}
        onStemOptionsChange={setStemOptions}
        images={editableImages}
        imageHandlers={imageHandlers}
        discountPercent={discountPercent}
        onDiscountPercentChange={setDiscountPercent}
        featuredPopular={featuredPopular}
        onFeaturedPopularChange={setFeaturedPopular}
      />

      <AdminCmsCollapsibleSection
        label="Product gallery"
        helper="Main images shown on the product page. Size or stem overrides are set in Pricing above."
        className="admin-cms-collapsible-panel"
        defaultOpen
      >
        <ProductImageListEditor
          images={editableImages}
          variantKey={null}
          disabled={!!loading}
          loadingKey={loading}
          onReorder={(ids) => imageHandlers.onReorder(null, ids)}
          onUpload={(file, options) => imageHandlers.onUpload(null, file, options)}
          onSaveAlt={imageHandlers.onSaveAlt}
          onReplace={(imageId, file, options) => imageHandlers.onReplace(imageId, file, options)}
          onEditFraming={imageHandlers.onEditFraming}
          onConvertToWebp={imageHandlers.onConvertToWebp}
          onRemove={imageHandlers.onRemove}
        />
      </AdminCmsCollapsibleSection>

      <div className="admin-cms-collapsible-stack">
        <AdminCmsCollapsibleSection label="Delivery speed">
          <AdminCheckboxGrid
            idPrefix="delivery-speed"
            options={[...ADMIN_DELIVERY_SPEED_OPTIONS]}
            selected={deliveryOptions}
            onChange={setDeliveryOptions}
          />
        </AdminCmsCollapsibleSection>

        <AdminCmsCollapsibleSection
          label="Available in these delivery markets"
          helper="Select the markets where this product can be delivered. Leave empty only if the product should not be shown anywhere."
        >
          <AdminCheckboxGrid
            idPrefix="markets"
            options={ADMIN_MARKET_OPTIONS}
            selected={availableMarkets}
            onChange={(v) => setAvailableMarkets(v as DeliveryDestinationId[])}
            showBulkActions
          />
        </AdminCmsCollapsibleSection>

        <AdminCmsCollapsibleSection label="Product format">
          <AdminCheckboxGrid
            idPrefix="format"
            options={ADMIN_FORMAT_OPTIONS}
            selected={presentationFormats}
            onChange={setPresentationFormats}
          />
        </AdminCmsCollapsibleSection>

        <AdminCmsCollapsibleSection label="Colors">
          <AdminCheckboxGrid
            idPrefix="colors"
            options={[...ADMIN_COLOR_OPTIONS]}
            selected={colors}
            onChange={setColors}
          />
        </AdminCmsCollapsibleSection>

        <AdminCmsCollapsibleSection label="Flower types">
          <AdminCheckboxGrid
            idPrefix="flowers"
            options={[...ADMIN_FLOWER_TYPE_OPTIONS]}
            selected={flowerTypes}
            onChange={setFlowerTypes}
          />
        </AdminCmsCollapsibleSection>

        <AdminCmsCollapsibleSection
          label="Occasions"
          helper="One bouquet can belong to multiple occasions. Leave empty if the product can be shown for any occasion."
        >
          <AdminCheckboxGrid
            idPrefix="occasion"
            options={[...ADMIN_OCCASION_OPTIONS]}
            selected={occasion}
            onChange={setOccasion}
          />
        </AdminCmsCollapsibleSection>
      </div>

      {bouquet.partnerName ? (
        <p className="admin-cms-slug-hint" style={{ marginTop: 12 }}>
          Partner: {bouquet.partnerName}
        </p>
      ) : null}
    </AdminCmsEditor>
  );
}
