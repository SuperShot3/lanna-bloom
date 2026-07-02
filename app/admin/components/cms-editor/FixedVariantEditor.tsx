'use client';

import { useMemo, useState } from 'react';
import type { CatalogBouquetPricing } from '@/lib/catalog/types';
import type { AdminCatalogProductImage } from '@/lib/catalog/types';
import { AdminCmsSection } from './AdminCmsSection';
import { AdminRowMenu } from './AdminRowMenu';
import { AdminSortableList } from './AdminSortableList';
import { AdminSortableRow } from './AdminSortableRow';
import { ProductImageListEditor, type ProductImageUploadOptions } from './ProductImageListEditor';

export type FixedVariantRow = NonNullable<CatalogBouquetPricing['fixedVariants']>[number] & {
  variantKey: string;
};

type ImageHandlers = {
  loadingKey: string | null;
  onReorder: (variantKey: string, orderedIds: string[]) => void | Promise<void>;
  onUpload: (variantKey: string, file: File, options?: ProductImageUploadOptions) => void | Promise<void>;
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

type Props = {
  variants: FixedVariantRow[];
  images: AdminCatalogProductImage[];
  bouquetSlug: string;
  onChange: (variants: FixedVariantRow[]) => void;
  imageHandlers: ImageHandlers;
  /** When true, omit outer section chrome (parent collapsible supplies the title). */
  embedded?: boolean;
};

export function FixedVariantEditor({
  variants,
  images,
  bouquetSlug,
  onChange,
  imageHandlers,
  embedded = false,
}: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(
    variants[0]?.variantKey ?? null
  );

  const ids = useMemo(() => variants.map((v) => v.variantKey), [variants]);

  function updateVariant(variantKey: string, patch: Partial<FixedVariantRow>) {
    onChange(
      variants.map((v) => (v.variantKey === variantKey ? { ...v, ...patch, variantKey } : v))
    );
  }

  function removeVariant(variantKey: string) {
    onChange(variants.filter((v) => v.variantKey !== variantKey));
    if (expandedKey === variantKey) setExpandedKey(null);
  }

  function addVariant() {
    const base = 'standard';
    let key = base;
    let n = 1;
    while (variants.some((v) => v.variantKey === key)) {
      key = `${base}-${n++}`;
    }
    const row: FixedVariantRow = {
      variantKey: key,
      nameEn: 'Standard',
      nameTh: '',
      price: 0,
      availability: true,
    };
    onChange([...variants, row]);
    setExpandedKey(key);
  }

  const list = (
      <div className={embedded ? 'admin-cms-panel-list' : 'admin-cms-bordered-list'}>
        {variants.length === 0 ? (
          <p className="admin-cms-empty-hint">No variants defined.</p>
        ) : (
          <AdminSortableList
            ids={ids}
            onReorder={(orderedKeys) => {
              const map = new Map(variants.map((v) => [v.variantKey, v]));
              onChange(orderedKeys.map((k) => map.get(k)).filter(Boolean) as FixedVariantRow[]);
            }}
            overlayTitle="Moving variant…"
          >
            {variants.map((variant) => {
              const isOpen = expandedKey === variant.variantKey;
              const rowTitle =
                variant.nameEn?.trim() ||
                (bouquetSlug ? `${bouquetSlug}-${variant.variantKey}` : variant.variantKey);

              return (
                <AdminSortableRow
                  key={variant.variantKey}
                  id={variant.variantKey}
                  title={rowTitle}
                  expanded={isOpen}
                  onRowClick={() =>
                    setExpandedKey(isOpen ? null : variant.variantKey)
                  }
                  menu={
                    <AdminRowMenu
                      items={[
                        {
                          id: 'remove',
                          label: 'Remove variant',
                          destructive: true,
                          onClick: () => removeVariant(variant.variantKey),
                        },
                      ]}
                    />
                  }
                >
                  <div className="admin-cms-variant-fields">
                    <label className="admin-cms-field">
                      <span className="admin-cms-field-label">Variant key</span>
                      <input className="admin-cms-input" value={variant.variantKey} readOnly />
                    </label>
                    <label className="admin-cms-field">
                      <span className="admin-cms-field-label">Name (EN)</span>
                      <input
                        className="admin-cms-input"
                        value={variant.nameEn ?? ''}
                        onChange={(e) =>
                          updateVariant(variant.variantKey, { nameEn: e.target.value })
                        }
                      />
                    </label>
                    <label className="admin-cms-field">
                      <span className="admin-cms-field-label">Name (TH)</span>
                      <input
                        className="admin-cms-input"
                        value={variant.nameTh ?? ''}
                        onChange={(e) =>
                          updateVariant(variant.variantKey, { nameTh: e.target.value })
                        }
                      />
                    </label>
                    <label className="admin-cms-field">
                      <span className="admin-cms-field-label">Price (฿)</span>
                      <input
                        type="number"
                        min={0}
                        className="admin-cms-input"
                        value={variant.price ?? 0}
                        onChange={(e) =>
                          updateVariant(variant.variantKey, {
                            price: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </label>
                    <label className="admin-cms-field">
                      <span className="admin-cms-field-label">Stem min</span>
                      <input
                        type="number"
                        min={0}
                        className="admin-cms-input"
                        value={variant.stemMin ?? ''}
                        onChange={(e) =>
                          updateVariant(variant.variantKey, {
                            stemMin: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </label>
                    <label className="admin-cms-field">
                      <span className="admin-cms-field-label">Stem max</span>
                      <input
                        type="number"
                        min={0}
                        className="admin-cms-input"
                        value={variant.stemMax ?? ''}
                        onChange={(e) =>
                          updateVariant(variant.variantKey, {
                            stemMax: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </label>
                  </div>

                  <AdminCmsSection label="Variant images" className="admin-cms-nested-section">
                    <ProductImageListEditor
                      images={images}
                      variantKey={variant.variantKey}
                      loadingKey={imageHandlers.loadingKey}
                      onReorder={(orderedIds) =>
                        imageHandlers.onReorder(variant.variantKey, orderedIds)
                      }
                      onUpload={(file, options) =>
                        imageHandlers.onUpload(variant.variantKey, file, options)
                      }
                      onSaveAlt={imageHandlers.onSaveAlt}
                      onReplace={(imageId, file, options) =>
                        imageHandlers.onReplace(imageId, file, options)
                      }
                      onEditFraming={imageHandlers.onEditFraming}
                      onSetPrimary={imageHandlers.onSetPrimary}
                      onConvertToWebp={imageHandlers.onConvertToWebp}
                      onRemove={imageHandlers.onRemove}
                    />
                  </AdminCmsSection>
                </AdminSortableRow>
              );
            })}
          </AdminSortableList>
        )}
        <button
          type="button"
          className="admin-cms-btn admin-cms-btn-outline admin-cms-btn-block"
          onClick={addVariant}
        >
          + Add variant
        </button>
      </div>
  );

  if (embedded) return list;

  return <AdminCmsSection label="Fixed bouquet variants">{list}</AdminCmsSection>;
}
