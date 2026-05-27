'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AdminCatalogProductImage } from '@/lib/catalog/types';
import {
  DEFAULT_SIZE_LABELS,
  SIZE_KEYS,
  stemVariantKey,
  type CatalogSizePricingRow,
  type CatalogStemPricingRow,
  type PricingType,
} from '@/lib/catalog/pricing';
import type { SizeKey } from '@/lib/bouquetOptions';
import { AdminCmsModal } from './AdminCmsModal';
import { AdminCmsSection } from './AdminCmsSection';
import { AdminCmsSelect } from './AdminCmsSelect';
import { AdminCmsSwitch } from './AdminCmsSwitch';
import { AdminRowMenu } from './AdminRowMenu';
import { AdminSortableList } from './AdminSortableList';
import { AdminSortableRow } from './AdminSortableRow';
import { ProductImageListEditor } from './ProductImageListEditor';

type ImageHandlers = {
  loadingKey: string | null;
  onReorder: (variantKey: string | null, orderedIds: string[]) => void | Promise<void>;
  onUpload: (variantKey: string | null, file: File) => void | Promise<void>;
  onSaveAlt: (image: AdminCatalogProductImage) => void | Promise<void>;
  onReplace: (imageId: string, file: File) => void | Promise<void>;
  onRemove: (imageId: string) => void | Promise<void>;
};

type Props = {
  pricingType: PricingType;
  onPricingTypeChange: (type: PricingType) => void;
  singlePrice: string;
  onSinglePriceChange: (value: string) => void;
  sizeRows: CatalogSizePricingRow[];
  onSizeRowsChange: (rows: CatalogSizePricingRow[]) => void;
  stemOptions: CatalogStemPricingRow[];
  onStemOptionsChange: (rows: CatalogStemPricingRow[]) => void;
  images: AdminCatalogProductImage[];
  imageHandlers: ImageHandlers;
  discountPercent: string;
  onDiscountPercentChange: (value: string) => void;
  featuredPopular: boolean;
  onFeaturedPopularChange: (value: boolean) => void;
};

const PRICING_TYPE_OPTIONS: { value: PricingType; label: string }[] = [
  { value: 'single_price', label: 'Single price' },
  { value: 'size_based', label: 'Size-based (S / M / L / XL)' },
  { value: 'stem_count', label: 'Stem count' },
];

const SIZE_SELECT_OPTIONS = SIZE_KEYS.map((key) => ({
  value: key,
  label: key.toUpperCase(),
}));

function updateSizeRow(
  rows: CatalogSizePricingRow[],
  key: SizeKey,
  patch: Partial<CatalogSizePricingRow>
): CatalogSizePricingRow[] {
  return rows.map((r) => (r.key === key ? { ...r, ...patch, key } : r));
}

function sizeRowTitle(row: CatalogSizePricingRow): string {
  const label = row.labelEn?.trim() || row.label?.trim();
  if (label && !/^(s|m|l|xl)$/i.test(label)) return label;
  return row.key.toUpperCase();
}

function sizeRowSubtitle(row: CatalogSizePricingRow): string | null {
  const price = row.price ?? 0;
  if (!row.enabled) return null;
  const parts: string[] = [`฿${price}`];
  if (row.description?.trim()) parts.push(row.description.trim());
  return parts.join(' · ');
}

function stemRowTitle(tier: CatalogStemPricingRow): string {
  return tier.labelEn?.trim() || `${tier.stemCount} stems`;
}

function stemRowSubtitle(tier: CatalogStemPricingRow): string | null {
  const parts: string[] = [`฿${tier.price ?? 0}`, `${tier.stemCount} stems`];
  if (tier.labelTh?.trim()) parts.push(tier.labelTh.trim());
  return parts.join(' · ');
}

function firstVariantImage(
  images: AdminCatalogProductImage[],
  variantKey: string
): AdminCatalogProductImage | undefined {
  return images.find((img) => img.variantKey === variantKey);
}

type SizeModalProps = {
  open: boolean;
  row: CatalogSizePricingRow | null;
  isNew: boolean;
  availableKeys: SizeKey[];
  images: AdminCatalogProductImage[];
  imageHandlers: ImageHandlers;
  onClose: () => void;
  onSave: (key: SizeKey, patch: Partial<CatalogSizePricingRow>) => void;
};

function BouquetSizeEditModal({
  open,
  row,
  isNew,
  availableKeys,
  images,
  imageHandlers,
  onClose,
  onSave,
}: SizeModalProps) {
  const [draftKey, setDraftKey] = useState<SizeKey>('s');
  const [labelEn, setLabelEn] = useState('');
  const [labelTh, setLabelTh] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [availability, setAvailability] = useState(true);
  const [showImages, setShowImages] = useState(false);

  const activeKey = row?.key ?? draftKey;
  const variantKey = activeKey;
  const overrideCount = images.filter((img) => img.variantKey === variantKey).length;

  useEffect(() => {
    if (!open) return;
    const key = row?.key ?? availableKeys[0] ?? 's';
    setDraftKey(key);
    setLabelEn(row?.labelEn ?? row?.label ?? key.toUpperCase());
    setLabelTh(row?.labelTh ?? '');
    setPrice(row?.price != null ? String(row.price) : '');
    setDescription(row?.description ?? '');
    setPreparationTime(
      row?.preparationTime != null ? String(row.preparationTime) : ''
    );
    setAvailability(row?.availability !== false);
    setShowImages(false);
  }, [open, row, availableKeys]);

  if (!open) return null;

  const sizeOptions = isNew
    ? availableKeys.map((key) => ({ value: key, label: key.toUpperCase() }))
    : SIZE_SELECT_OPTIONS;

  function handleSave() {
    const key = (isNew ? draftKey : row?.key) as SizeKey;
    if (!key) return;
    onSave(key, {
      enabled: true,
      labelEn: labelEn.trim() || key.toUpperCase(),
      labelTh: labelTh.trim() || undefined,
      price: Number(price) || 0,
      description: description.trim() || undefined,
      preparationTime: preparationTime ? Number(preparationTime) : undefined,
      availability,
      legacyOptionId: row?.legacyOptionId ?? `legacy_${key}`,
    });
    onClose();
  }

  return (
    <AdminCmsModal
      open={open}
      title={isNew ? 'Add bouquet size' : 'Edit bouquet size'}
      onClose={onClose}
      footer={
        <div className="admin-cms-modal-actions">
          <button type="button" className="admin-cms-btn admin-cms-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="admin-cms-btn admin-cms-btn-primary" onClick={handleSave}>
            {isNew ? 'Add size' : 'Done'}
          </button>
        </div>
      }
    >
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Size</span>
        <AdminCmsSelect
          id="bouquet-size-key"
          value={isNew ? draftKey : activeKey}
          options={sizeOptions}
          disabled={!isNew}
          onChange={(value) => setDraftKey(value as SizeKey)}
        />
      </label>
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Label (EN)</span>
        <input
          className="admin-cms-input"
          value={labelEn}
          onChange={(e) => setLabelEn(e.target.value)}
          placeholder={DEFAULT_SIZE_LABELS[activeKey].en}
        />
      </label>
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Label (TH)</span>
        <input
          className="admin-cms-input"
          value={labelTh}
          onChange={(e) => setLabelTh(e.target.value)}
          placeholder={DEFAULT_SIZE_LABELS[activeKey].th}
        />
      </label>
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Price (THB)</span>
        <input
          type="number"
          min={0}
          className="admin-cms-input"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </label>
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Description</span>
        <input
          className="admin-cms-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. 5 Sunflowers"
        />
      </label>
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Preparation time (minutes)</span>
        <input
          type="number"
          min={0}
          className="admin-cms-input"
          value={preparationTime}
          onChange={(e) => setPreparationTime(e.target.value)}
        />
      </label>
      <div className="admin-cms-modal-panel">
        <AdminCmsSwitch
          id="bouquet-size-availability"
          label="Availability"
          checked={availability}
          onChange={setAvailability}
        />
      </div>
      <details
        className="admin-cms-modal-images"
        open={showImages}
        onToggle={(e) => setShowImages((e.target as HTMLDetailsElement).open)}
      >
        <summary>Size images ({overrideCount}) — optional</summary>
        <ProductImageListEditor
          images={images}
          variantKey={variantKey}
          loadingKey={imageHandlers.loadingKey}
          onReorder={(ids) => imageHandlers.onReorder(variantKey, ids)}
          onUpload={(file) => imageHandlers.onUpload(variantKey, file)}
          onSaveAlt={imageHandlers.onSaveAlt}
          onReplace={imageHandlers.onReplace}
          onRemove={imageHandlers.onRemove}
        />
      </details>
    </AdminCmsModal>
  );
}

type StemModalProps = {
  open: boolean;
  tier: CatalogStemPricingRow | null;
  index: number | null;
  images: AdminCatalogProductImage[];
  imageHandlers: ImageHandlers;
  onClose: () => void;
  onSave: (index: number | null, tier: CatalogStemPricingRow) => void;
};

function StemTierEditModal({
  open,
  tier,
  index,
  images,
  imageHandlers,
  onClose,
  onSave,
}: StemModalProps) {
  const [stemCount, setStemCount] = useState('12');
  const [labelEn, setLabelEn] = useState('');
  const [labelTh, setLabelTh] = useState('');
  const [price, setPrice] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [availability, setAvailability] = useState(true);
  const [showImages, setShowImages] = useState(false);

  const count = Math.max(1, Number(stemCount) || 1);
  const vk = stemVariantKey(count);
  const overrideCount = images.filter((img) => img.variantKey === vk).length;

  useEffect(() => {
    if (!open) return;
    const n = tier?.stemCount ?? 12;
    setStemCount(String(n));
    setLabelEn(tier?.labelEn ?? `${n} roses`);
    setLabelTh(tier?.labelTh ?? '');
    setPrice(tier?.price != null ? String(tier.price) : '');
    setPreparationTime(
      tier?.preparationTime != null ? String(tier.preparationTime) : ''
    );
    setAvailability(tier?.availability !== false);
    setShowImages(false);
  }, [open, tier]);

  if (!open) return null;

  function handleSave() {
    const n = Math.max(1, Number(stemCount) || 1);
    onSave(index, {
      stemCount: n,
      price: Number(price) || 0,
      labelEn: labelEn.trim() || `${n} roses`,
      labelTh: labelTh.trim() || undefined,
      preparationTime: preparationTime ? Number(preparationTime) : undefined,
      availability,
    });
    onClose();
  }

  return (
    <AdminCmsModal
      open={open}
      title={index == null ? 'Add stem tier' : 'Edit stem tier'}
      onClose={onClose}
      footer={
        <div className="admin-cms-modal-actions">
          <button type="button" className="admin-cms-btn admin-cms-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="admin-cms-btn admin-cms-btn-primary" onClick={handleSave}>
            {index == null ? 'Add tier' : 'Done'}
          </button>
        </div>
      }
    >
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Stem count</span>
        <input
          type="number"
          min={1}
          className="admin-cms-input"
          value={stemCount}
          onChange={(e) => setStemCount(e.target.value)}
          required
        />
      </label>
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Label (EN)</span>
        <input
          className="admin-cms-input"
          value={labelEn}
          onChange={(e) => setLabelEn(e.target.value)}
        />
      </label>
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Label (TH)</span>
        <input
          className="admin-cms-input"
          value={labelTh}
          onChange={(e) => setLabelTh(e.target.value)}
        />
      </label>
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Price (THB)</span>
        <input
          type="number"
          min={0}
          className="admin-cms-input"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </label>
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Preparation time (minutes)</span>
        <input
          type="number"
          min={0}
          className="admin-cms-input"
          value={preparationTime}
          onChange={(e) => setPreparationTime(e.target.value)}
        />
      </label>
      <div className="admin-cms-modal-panel">
        <AdminCmsSwitch
          id="stem-tier-availability"
          label="Availability"
          checked={availability}
          onChange={setAvailability}
        />
      </div>
      <details
        className="admin-cms-modal-images"
        open={showImages}
        onToggle={(e) => setShowImages((e.target as HTMLDetailsElement).open)}
      >
        <summary>Tier images ({overrideCount}) — optional</summary>
        <ProductImageListEditor
          images={images}
          variantKey={vk}
          loadingKey={imageHandlers.loadingKey}
          onReorder={(ids) => imageHandlers.onReorder(vk, ids)}
          onUpload={(file) => imageHandlers.onUpload(vk, file)}
          onSaveAlt={imageHandlers.onSaveAlt}
          onReplace={imageHandlers.onReplace}
          onRemove={imageHandlers.onRemove}
        />
      </details>
    </AdminCmsModal>
  );
}

export function PricingSectionEditor({
  pricingType,
  onPricingTypeChange,
  singlePrice,
  onSinglePriceChange,
  sizeRows,
  onSizeRowsChange,
  stemOptions,
  onStemOptionsChange,
  images,
  imageHandlers,
  discountPercent,
  onDiscountPercentChange,
  featuredPopular,
  onFeaturedPopularChange,
}: Props) {
  const [editingSizeKey, setEditingSizeKey] = useState<SizeKey | 'new' | null>(null);
  const [editingStemIndex, setEditingStemIndex] = useState<number | 'new' | null>(null);

  const enabledSizeRows = useMemo(
    () => sizeRows.filter((r) => r.enabled),
    [sizeRows]
  );
  const enabledSizeIds = enabledSizeRows.map((r) => r.key);
  const availableSizeKeys = useMemo(
    () => SIZE_KEYS.filter((key) => !sizeRows.find((r) => r.key === key)?.enabled),
    [sizeRows]
  );

  const stemIds = useMemo(
    () => stemOptions.map((t, i) => `stem-${t.stemCount}-${i}`),
    [stemOptions]
  );

  function reorderEnabledSizes(orderedKeys: string[]) {
    const byKey = new Map(sizeRows.map((r) => [r.key, r]));
    const disabled = sizeRows.filter((r) => !r.enabled);
    onSizeRowsChange([
      ...orderedKeys.map((k) => byKey.get(k as SizeKey)!),
      ...disabled,
    ]);
  }

  function disableSize(key: SizeKey) {
    onSizeRowsChange(
      updateSizeRow(sizeRows, key, {
        enabled: false,
        availability: false,
      })
    );
    if (editingSizeKey === key) setEditingSizeKey(null);
  }

  function openAddSize() {
    if (availableSizeKeys.length === 0) return;
    setEditingSizeKey('new');
  }

  function addStemTier() {
    setEditingStemIndex('new');
  }

  const editingSizeRow =
    editingSizeKey && editingSizeKey !== 'new'
      ? sizeRows.find((r) => r.key === editingSizeKey) ?? null
      : editingSizeKey === 'new'
        ? null
        : null;

  const editingStemTier =
    editingStemIndex != null && editingStemIndex !== 'new'
      ? stemOptions[editingStemIndex] ?? null
      : null;

  return (
    <AdminCmsSection
      label="Pricing"
      helper="Choose how this bouquet is priced. Product gallery is managed separately below."
    >
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Pricing type</span>
        <AdminCmsSelect
          id="pricing-type"
          value={pricingType}
          options={PRICING_TYPE_OPTIONS}
          onChange={(value) => onPricingTypeChange(value as PricingType)}
        />
      </label>

      {pricingType === 'single_price' ? (
        <label className="admin-cms-field">
          <span className="admin-cms-field-label">Price (THB)</span>
          <input
            type="number"
            min={0}
            className="admin-cms-input"
            value={singlePrice}
            onChange={(e) => onSinglePriceChange(e.target.value)}
            required
          />
        </label>
      ) : null}

      {pricingType === 'size_based' ? (
        <div className="admin-cms-pricing-list-block">
          <h4 className="admin-cms-pricing-list-title">Sizes &amp; prices (S / M / L / XL)</h4>
          <div className="admin-cms-bordered-list">
            {enabledSizeRows.length === 0 ? (
              <p className="admin-cms-empty-hint">No sizes yet. Add S, M, L, or XL.</p>
            ) : (
              <AdminSortableList
                ids={enabledSizeIds}
                onReorder={reorderEnabledSizes}
                overlayTitle="Moving size…"
              >
                {enabledSizeRows.map((row) => {
                  const thumb = firstVariantImage(images, row.key);
                  const subtitle = sizeRowSubtitle(row);
                  return (
                    <AdminSortableRow
                      key={row.key}
                      id={row.key}
                      title={sizeRowTitle(row)}
                      icon={
                        thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb.url} alt="" className="admin-cms-image-thumb" />
                        ) : (
                          <span className="material-symbols-outlined">inventory_2</span>
                        )
                      }
                      onRowClick={() => setEditingSizeKey(row.key)}
                      menu={
                        <AdminRowMenu
                          items={[
                            {
                              id: 'edit',
                              label: 'Edit size',
                              onClick: () => setEditingSizeKey(row.key),
                            },
                            {
                              id: 'remove',
                              label: 'Remove size',
                              destructive: true,
                              onClick: () => disableSize(row.key),
                            },
                          ]}
                        />
                      }
                      badge={
                        subtitle ? (
                          <span className="admin-cms-sortable-meta">{subtitle}</span>
                        ) : null
                      }
                    />
                  );
                })}
              </AdminSortableList>
            )}
            <button
              type="button"
              className="admin-cms-add-item-btn"
              onClick={openAddSize}
              disabled={availableSizeKeys.length === 0}
            >
              <span className="material-symbols-outlined" aria-hidden>
                add
              </span>
              Add item
            </button>
          </div>
        </div>
      ) : null}

      {pricingType === 'stem_count' ? (
        <div className="admin-cms-pricing-list-block">
          <h4 className="admin-cms-pricing-list-title">Stem tiers</h4>
          <div className="admin-cms-bordered-list">
            {stemOptions.length === 0 ? (
              <p className="admin-cms-empty-hint">Add at least one stem tier.</p>
            ) : (
              <AdminSortableList
                ids={stemIds}
                onReorder={(orderedIds) => {
                  const map = new Map(stemOptions.map((t, i) => [stemIds[i], t]));
                  onStemOptionsChange(
                    orderedIds.map((id) => map.get(id)).filter(Boolean) as CatalogStemPricingRow[]
                  );
                }}
                overlayTitle="Moving tier…"
              >
                {stemOptions.map((tier, index) => {
                  const id = stemIds[index]!;
                  const vk = stemVariantKey(tier.stemCount);
                  const thumb = firstVariantImage(images, vk);
                  const subtitle = stemRowSubtitle(tier);
                  return (
                    <AdminSortableRow
                      key={id}
                      id={id}
                      title={stemRowTitle(tier)}
                      icon={
                        thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb.url} alt="" className="admin-cms-image-thumb" />
                        ) : (
                          <span className="material-symbols-outlined">filter_vintage</span>
                        )
                      }
                      onRowClick={() => setEditingStemIndex(index)}
                      menu={
                        <AdminRowMenu
                          items={[
                            {
                              id: 'edit',
                              label: 'Edit tier',
                              onClick: () => setEditingStemIndex(index),
                            },
                            {
                              id: 'remove',
                              label: 'Remove tier',
                              destructive: true,
                              onClick: () => {
                                onStemOptionsChange(stemOptions.filter((_, i) => i !== index));
                                if (editingStemIndex === index) setEditingStemIndex(null);
                              },
                            },
                          ]}
                        />
                      }
                      badge={
                        subtitle ? (
                          <span className="admin-cms-sortable-meta">{subtitle}</span>
                        ) : null
                      }
                    />
                  );
                })}
              </AdminSortableList>
            )}
            <button
              type="button"
              className="admin-cms-add-item-btn"
              onClick={addStemTier}
            >
              <span className="material-symbols-outlined" aria-hidden>
                add
              </span>
              Add item
            </button>
          </div>
        </div>
      ) : null}

      <label className="admin-cms-field">
        <span className="admin-cms-field-label">Sale discount (%)</span>
        <input
          type="number"
          min={0}
          max={90}
          className="admin-cms-input"
          placeholder="1–90 or empty"
          value={discountPercent}
          onChange={(e) => onDiscountPercentChange(e.target.value)}
        />
      </label>
      <label className="admin-cms-checkbox">
        <input
          type="checkbox"
          checked={featuredPopular}
          onChange={(e) => onFeaturedPopularChange(e.target.checked)}
        />
        <span>Popular pick (homepage badge)</span>
      </label>

      <BouquetSizeEditModal
        open={editingSizeKey != null}
        row={editingSizeRow}
        isNew={editingSizeKey === 'new'}
        availableKeys={availableSizeKeys}
        images={images}
        imageHandlers={imageHandlers}
        onClose={() => setEditingSizeKey(null)}
        onSave={(key, patch) => onSizeRowsChange(updateSizeRow(sizeRows, key, patch))}
      />

      <StemTierEditModal
        open={editingStemIndex != null}
        tier={editingStemTier}
        index={editingStemIndex === 'new' ? null : editingStemIndex}
        images={images}
        imageHandlers={imageHandlers}
        onClose={() => setEditingStemIndex(null)}
        onSave={(index, tier) => {
          if (index == null) {
            onStemOptionsChange([...stemOptions, tier]);
          } else {
            const next = [...stemOptions];
            next[index] = tier;
            onStemOptionsChange(next);
          }
        }}
      />
    </AdminCmsSection>
  );
}
