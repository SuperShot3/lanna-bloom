'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  AdminCmsEditor,
  AdminCmsSection,
  AdminCheckboxGrid,
  ProductImageListEditor,
} from '@/app/admin/components/cms-editor';
import { useCatalogShelfDirty } from '@/app/admin/(dashboard)/products/CatalogShelfDirtyContext';
import { useCatalogUnsavedLeaveGuard } from '@/app/admin/(dashboard)/products/useCatalogUnsavedLeaveGuard';
import type { AdminCatalogProductImage, AdminProductDetail } from '@/lib/catalog/types';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import {
  ADMIN_MARKET_OPTIONS,
  ADMIN_OCCASION_OPTIONS,
  availableMarketsFromExcluded,
  excludedMarketsFromAvailable,
} from '@/lib/catalogAdminFieldOptions';
import { confirmCatalogDeleteAction } from '@/app/admin/components/confirmDelete';
import {
  approveProductAction,
  deleteProductAction,
  deleteProductImageAction,
  reorderProductImagesAction,
  publishProductDraftAction,
  unpublishProductAction,
  updateProductByAdminAction,
  updateProductImageAltAction,
  uploadProductImageAction,
} from '../actions';

const GPT_ITEM_CARD_URL =
  'https://chatgpt.com/g/g-6a1819eb5c9081919d025d2329c63bdb-kartochka-tovara';

const CATEGORY_LABELS: Record<string, string> = {
  balloons: 'Balloons',
  plushy_toys: 'Toys & Plush',
  gifts: 'Gifts',
  money_flowers: 'Money Flowers',
  handmade_floral: 'Handmade Floral',
  food_sweets: 'Food & Sweets',
  wellness: 'Wellness',
  home_lifestyle: 'Home & Lifestyle',
  stationery: 'Stationery',
  baby_family: 'Baby & Family',
  fashion: 'Fashion & Accessories',
  seasonal: 'Seasonal',
  other: 'Other',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Pending',
  live: 'Live',
  needs_changes: 'Needs changes',
  rejected: 'Rejected',
};

type Props = { product: AdminProductDetail };

function parseOccasion(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AdminProductDetailClient({ product }: Props) {
  const router = useRouter();
  const { getProductPending, setProductPending } = useCatalogShelfDirty();

  const pending = getProductPending(product.id);

  const [nameEn, setNameEn] = useState(() => pending?.nameEn ?? product.nameEn);
  const [nameTh, setNameTh] = useState(() => pending?.nameTh ?? product.nameTh ?? '');
  const [descriptionEn, setDescriptionEn] = useState(
    () => pending?.descriptionEn ?? product.descriptionEn ?? ''
  );
  const [descriptionTh, setDescriptionTh] = useState(
    () => pending?.descriptionTh ?? product.descriptionTh ?? ''
  );
  const [price, setPrice] = useState(() => pending?.price ?? String(product.price));
  const [occasion, setOccasion] = useState<string[]>(
    () => pending?.occasion ?? parseOccasion(product.occasion)
  );
  const [availableMarkets, setAvailableMarkets] = useState<DeliveryDestinationId[]>(
    () =>
      pending?.availableMarkets ??
      availableMarketsFromExcluded(product.excludedDeliveryDestinations)
  );
  const [editableImages, setEditableImages] = useState<AdminCatalogProductImage[]>(
    product.editableImages ?? []
  );
  const [copyOpen, setCopyOpen] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (getProductPending(product.id)) return;
    setNameEn(product.nameEn);
    setNameTh(product.nameTh ?? '');
    setDescriptionEn(product.descriptionEn ?? '');
    setDescriptionTh(product.descriptionTh ?? '');
    setPrice(String(product.price));
    setOccasion(parseOccasion(product.occasion));
    setAvailableMarkets(availableMarketsFromExcluded(product.excludedDeliveryDestinations));
    setEditableImages(product.editableImages ?? []);
  }, [product, getProductPending]);

  const catalogHref = product.slug ? `/en/catalog/${product.slug}` : null;
  const isLiveOnSite = product.moderationStatus === 'live';
  const usesDraftWorkflow = isLiveOnSite;

  const savedSnapshot = useMemo(
    () => ({
      nameEn: product.nameEn,
      nameTh: product.nameTh ?? '',
      descriptionEn: product.descriptionEn ?? '',
      descriptionTh: product.descriptionTh ?? '',
      price: String(product.price),
      occasion: parseOccasion(product.occasion).join('|'),
      markets: availableMarketsFromExcluded(product.excludedDeliveryDestinations).join('|'),
    }),
    [product]
  );

  const hasUnsavedChanges = useMemo(() => {
    return (
      nameEn !== savedSnapshot.nameEn ||
      nameTh !== savedSnapshot.nameTh ||
      descriptionEn !== savedSnapshot.descriptionEn ||
      descriptionTh !== savedSnapshot.descriptionTh ||
      price !== savedSnapshot.price ||
      occasion.join('|') !== savedSnapshot.occasion ||
      availableMarkets.join('|') !== savedSnapshot.markets
    );
  }, [
    nameEn,
    nameTh,
    descriptionEn,
    descriptionTh,
    price,
    occasion,
    availableMarkets,
    savedSnapshot,
  ]);

  const statusClass =
    product.moderationStatus === 'live'
      ? 'is-live'
      : product.moderationStatus === 'rejected'
        ? 'is-rejected'
        : 'is-pending';

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setProductPending(product.id, null);
      return;
    }
    setProductPending(product.id, {
      nameEn,
      nameTh,
      descriptionEn,
      descriptionTh,
      price,
      occasion,
      availableMarkets,
    });
  }, [
    hasUnsavedChanges,
    product.id,
    setProductPending,
    nameEn,
    nameTh,
    descriptionEn,
    descriptionTh,
    price,
    occasion,
    availableMarkets,
  ]);

  useCatalogUnsavedLeaveGuard(hasUnsavedChanges);

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setLoading('save');

    const formData = new FormData();
    formData.set('productId', product.id);
    formData.set('nameEn', nameEn);
    formData.set('nameTh', nameTh);
    formData.set('descriptionEn', descriptionEn);
    formData.set('descriptionTh', descriptionTh);
    formData.set('price', price);
    formData.set('occasion', JSON.stringify(occasion));
    formData.set(
      'excludedDeliveryDestinations',
      JSON.stringify(excludedMarketsFromAvailable(availableMarkets))
    );

    const result = await updateProductByAdminAction(formData);
    setLoading(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setProductPending(product.id, null);
    setSuccess(usesDraftWorkflow ? 'Draft saved on server' : 'Saved');
    router.refresh();
  }

  async function handlePublish() {
    if (!product.draftRevisionId) return;
    setError(null);
    setSuccess(null);
    setLoading('publish');
    const result = await publishProductDraftAction(product.id, product.draftRevisionId);
    setLoading(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setProductPending(product.id, null);
    setSuccess('Published to website');
    router.refresh();
  }

  async function handleApprove() {
    setError(null);
    setSuccess(null);
    setLoading('approve');
    const commission = product.commissionPercent ?? 0;
    const result = await approveProductAction(product.id, commission);
    setLoading(null);
    if (result.error) setError(result.error);
    else {
      setSuccess('Approved');
      router.refresh();
    }
  }

  async function handleUnpublish() {
    if (!window.confirm('Unpublish this product from the website?')) return;
    setError(null);
    setSuccess(null);
    setLoading('unpublish');
    const result = await unpublishProductAction(product.id);
    setLoading(null);
    if (result.error) setError(result.error);
    else {
      setSuccess('Unpublished (not live)');
      router.refresh();
    }
  }

  async function handleDelete() {
    const label = nameEn.trim() || product.nameEn;
    if (!confirmCatalogDeleteAction(label)) return;
    setError(null);
    setSuccess(null);
    setLoading('delete');
    const result = await deleteProductAction(product.id);
    setLoading(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push('/admin/products');
    router.refresh();
  }

  return (
    <AdminCmsEditor>
      <div className="admin-cms-toolbar">
        <div className="admin-cms-toolbar-meta">
          <span className={`admin-cms-status ${statusClass}`}>
            {STATUS_LABELS[product.moderationStatus] ?? product.moderationStatus}
          </span>
          <span className="admin-cms-slug-hint">
            {CATEGORY_LABELS[product.category] ?? product.category}
            {product.slug ? ` · ${product.slug}` : ''}
          </span>
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
          {usesDraftWorkflow && product.hasDraft ? (
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
          {product.moderationStatus !== 'live' ? (
            <button
              type="button"
              className="admin-cms-btn admin-cms-btn-outline"
              disabled={!!loading}
              onClick={handleApprove}
            >
              Approve & live
            </button>
          ) : null}
          {product.moderationStatus === 'live' ? (
            <button
              type="button"
              className="admin-cms-btn admin-cms-btn-outline"
              disabled={!!loading}
              onClick={handleUnpublish}
            >
              {loading === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}
            </button>
          ) : null}
          {product.moderationStatus === 'live' && catalogHref ? (
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

      <AdminCmsSection label="Product images">
        <div className="admin-cms-bordered-list">
          <ProductImageListEditor
            images={editableImages}
            disabled={!!loading}
            loadingKey={loading}
            enableCrop
            onReorder={async (orderedIds) => {
              setLoading('reorder');
              const result = await reorderProductImagesAction(product.id, orderedIds);
              setLoading(null);
              if (result.error) setError(result.error);
              else router.refresh();
            }}
            onUpload={async (file) => {
              setLoading('upload');
              const formData = new FormData();
              formData.set('productId', product.id);
              formData.set('file', file);
              formData.set('altEn', nameEn);
              formData.set('altTh', nameTh);
              const result = await uploadProductImageAction(formData);
              setLoading(null);
              if (result.error) setError(result.error);
              else router.refresh();
            }}
            onSaveAlt={async (image) => {
              setLoading(`alt-${image.id}`);
              const formData = new FormData();
              formData.set('productId', product.id);
              formData.set('imageId', image.id);
              formData.set('altEn', image.altEn);
              formData.set('altTh', image.altTh);
              const result = await updateProductImageAltAction(formData);
              setLoading(null);
              if (result.error) setError(result.error);
              else router.refresh();
            }}
            onReplace={async (imageId, file) => {
              const image = editableImages.find((i) => i.id === imageId);
              if (!image) return;
              setLoading('replace');
              const formData = new FormData();
              formData.set('productId', product.id);
              formData.set('file', file);
              formData.set('altEn', image.altEn || nameEn);
              formData.set('altTh', image.altTh || nameTh);
              const upload = await uploadProductImageAction(formData);
              if (upload.error) {
                setLoading(null);
                setError(upload.error);
                return;
              }
              const del = await deleteProductImageAction(product.id, imageId);
              setLoading(null);
              if (del.error) setError(del.error);
              else router.refresh();
            }}
            onRemove={async (imageId) => {
              if (!window.confirm('Remove this image?')) return;
              setLoading(`delete-${imageId}`);
              const result = await deleteProductImageAction(product.id, imageId);
              setLoading(null);
              if (result.error) setError(result.error);
              else router.refresh();
            }}
          />
        </div>
      </AdminCmsSection>

      <AdminCmsSection
        label="Available in these delivery markets"
        helper="Select the markets where this product can be delivered. Leave empty only if the product should not be shown anywhere."
      >
        <AdminCheckboxGrid
          idPrefix="product-markets"
          options={ADMIN_MARKET_OPTIONS}
          selected={availableMarkets}
          onChange={(v) => setAvailableMarkets(v as DeliveryDestinationId[])}
          showBulkActions
        />
      </AdminCmsSection>

      <AdminCmsSection
        label="Occasions"
        helper="Leave empty if the product can be shown for any occasion."
      >
        <AdminCheckboxGrid
          idPrefix="product-occasion"
          options={[...ADMIN_OCCASION_OPTIONS]}
          selected={occasion}
          onChange={setOccasion}
        />
      </AdminCmsSection>

      <div className="admin-cms-collapsible">
        <button
          type="button"
          className="admin-cms-collapsible-trigger"
          aria-expanded={copyOpen}
          onClick={() => setCopyOpen((v) => !v)}
        >
          Copy & pricing
          <span className={`material-symbols-outlined admin-cms-sortable-chevron${copyOpen ? ' is-open' : ''}`}>
            chevron_right
          </span>
        </button>
        {copyOpen ? (
          <div className="admin-cms-collapsible-body">
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
              <span className="admin-cms-field-label">Price (฿)</span>
              <input
                type="number"
                min={0}
                className="admin-cms-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>
    </AdminCmsEditor>
  );
}
