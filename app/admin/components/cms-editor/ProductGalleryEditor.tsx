'use client';

import { useMemo, useState } from 'react';
import type { AdminCatalogProductImage } from '@/lib/catalog/types';
import { stemVariantKey, type CatalogStemPricingRow } from '@/lib/catalog/pricing';
import {
  ProductImageListEditor,
  type ProductImageUploadOptions,
} from './ProductImageListEditor';

export type StemAssignTarget = {
  variantKey: string;
  label: string;
};

type Props = {
  images: AdminCatalogProductImage[];
  stemOptions?: CatalogStemPricingRow[];
  disabled?: boolean;
  loadingKey?: string | null;
  onReorder: (variantKey: string | null, orderedIds: string[]) => void | Promise<void>;
  onUpload: (
    variantKey: string | null,
    file: File,
    options?: ProductImageUploadOptions
  ) => void | Promise<void>;
  onAssignVariant: (imageIds: string[], variantKey: string | null) => void | Promise<void>;
  onSaveAlt: (image: AdminCatalogProductImage) => void | Promise<void>;
  onReplace: (
    imageId: string,
    file: File,
    options?: ProductImageUploadOptions
  ) => void | Promise<void>;
  onEditFraming?: (imageId: string, file: File) => void | Promise<void>;
  onSetPrimary?: (imageId: string) => void | Promise<void>;
  onConvertToWebp?: (imageId: string) => void | Promise<void>;
  onRemove: (imageId: string) => void | Promise<void>;
};

function stemAssignTargets(stemOptions: CatalogStemPricingRow[]): StemAssignTarget[] {
  return stemOptions.map((tier) => {
    const count = Math.max(1, Number(tier.stemCount) || 1);
    const label = tier.labelEn?.trim() || `${count} stems`;
    return {
      variantKey: stemVariantKey(count),
      label: `${label} · ${count} stems`,
    };
  });
}

export function ProductGalleryEditor({
  images,
  stemOptions = [],
  disabled,
  loadingKey,
  onReorder,
  onUpload,
  onAssignVariant,
  onSaveAlt,
  onReplace,
  onEditFraming,
  onSetPrimary,
  onConvertToWebp,
  onRemove,
}: Props) {
  const targets = useMemo(() => stemAssignTargets(stemOptions), [stemOptions]);
  const stemAssignEnabled = targets.length > 0;
  const targetKeys = useMemo(() => new Set(targets.map((t) => t.variantKey)), [targets]);
  const orphanStemKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const img of images) {
      const vk = img.variantKey?.trim();
      if (vk && vk.startsWith('stem_') && !targetKeys.has(vk)) keys.add(vk);
    }
    return Array.from(keys).sort();
  }, [images, targetKeys]);
  const [selectedMainIds, setSelectedMainIds] = useState<string[]>([]);
  const [assignTo, setAssignTo] = useState('');

  const mainIds = useMemo(
    () => images.filter((img) => !img.variantKey).map((img) => img.id),
    [images]
  );

  // Drop selections that left the main gallery after assign.
  const selectedInMain = selectedMainIds.filter((id) => mainIds.includes(id));

  async function handleAssign() {
    if (!assignTo || selectedInMain.length === 0) return;
    await onAssignVariant(selectedInMain, assignTo);
    setSelectedMainIds([]);
    setAssignTo('');
  }

  return (
    <div className="admin-cms-product-gallery">
      {stemAssignEnabled ? (
        <div className="admin-cms-gallery-assign-bar">
          <label className="admin-cms-checkbox">
            <input
              type="checkbox"
              checked={mainIds.length > 0 && selectedInMain.length === mainIds.length}
              disabled={disabled || !!loadingKey || mainIds.length === 0}
              onChange={(e) => {
                setSelectedMainIds(e.target.checked ? [...mainIds] : []);
              }}
            />
            <span>Select all main</span>
          </label>
          <select
            className="admin-cms-input admin-cms-gallery-assign-select"
            value={assignTo}
            disabled={disabled || !!loadingKey || selectedInMain.length === 0}
            onChange={(e) => setAssignTo(e.target.value)}
          >
            <option value="">Assign to stem tier…</option>
            {targets.map((t) => (
              <option key={t.variantKey} value={t.variantKey}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="admin-cms-btn admin-cms-btn-outline"
            disabled={disabled || !!loadingKey || !assignTo || selectedInMain.length === 0}
            onClick={() => void handleAssign()}
          >
            Assign ({selectedInMain.length})
          </button>
        </div>
      ) : null}

      <h4 className="admin-cms-pricing-list-title">Main gallery</h4>
      <ProductImageListEditor
        images={images}
        variantKey={null}
        disabled={disabled}
        loadingKey={loadingKey}
        allowMultipleUpload
        selectable={stemAssignEnabled}
        selectedIds={selectedInMain}
        onSelectedIdsChange={setSelectedMainIds}
        onReorder={(ids) => onReorder(null, ids)}
        onUpload={(file, options) => onUpload(null, file, options)}
        onSaveAlt={onSaveAlt}
        onReplace={onReplace}
        onEditFraming={onEditFraming}
        onSetPrimary={onSetPrimary}
        onConvertToWebp={onConvertToWebp}
        onRemove={onRemove}
      />

      {stemAssignEnabled
        ? targets.map((target) => {
            const count = images.filter((img) => img.variantKey === target.variantKey).length;
            return (
              <div key={target.variantKey} className="admin-cms-gallery-tier-block">
                <h4 className="admin-cms-pricing-list-title">
                  {target.label} — {count} photo{count === 1 ? '' : 's'}
                </h4>
                <ProductImageListEditor
                  images={images}
                  variantKey={target.variantKey}
                  disabled={disabled}
                  loadingKey={loadingKey}
                  hideUpload
                  onReorder={(ids) => onReorder(target.variantKey, ids)}
                  onUpload={() => undefined}
                  onSaveAlt={onSaveAlt}
                  onReplace={onReplace}
                  onEditFraming={onEditFraming}
                  onConvertToWebp={onConvertToWebp}
                  onRemove={onRemove}
                  onUnassign={(imageId) => onAssignVariant([imageId], null)}
                />
              </div>
            );
          })
        : null}

      {stemAssignEnabled && orphanStemKeys.length > 0
        ? orphanStemKeys.map((vk) => {
            const count = images.filter((img) => img.variantKey === vk).length;
            const stems = vk.replace(/^stem_/, '');
            return (
              <div key={vk} className="admin-cms-gallery-tier-block">
                <h4 className="admin-cms-pricing-list-title">
                  Orphaned · {stems} stems — {count} photo{count === 1 ? '' : 's'}
                </h4>
                <p className="admin-cms-empty-hint">
                  No matching stem tier. Unassign these photos or add a tier with this stem count.
                </p>
                <ProductImageListEditor
                  images={images}
                  variantKey={vk}
                  disabled={disabled}
                  loadingKey={loadingKey}
                  hideUpload
                  onReorder={(ids) => onReorder(vk, ids)}
                  onUpload={() => undefined}
                  onSaveAlt={onSaveAlt}
                  onReplace={onReplace}
                  onEditFraming={onEditFraming}
                  onConvertToWebp={onConvertToWebp}
                  onRemove={onRemove}
                  onUnassign={(imageId) => onAssignVariant([imageId], null)}
                />
              </div>
            );
          })
        : null}
    </div>
  );
}
