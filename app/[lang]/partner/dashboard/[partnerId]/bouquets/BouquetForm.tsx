'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { BouquetSize } from '@/lib/bouquets';
import type { SizeKey } from '@/lib/bouquets';

const CATEGORY_OPTIONS = [
  { value: 'roses', labelKey: 'roses' as const },
  { value: 'mixed', labelKey: 'mixed' as const },
  { value: 'mono', labelKey: 'mono' as const },
  { value: 'inBox', labelKey: 'inBox' as const },
  { value: 'romantic', labelKey: 'romantic' as const },
  { value: 'birthday', labelKey: 'birthday' as const },
  { value: 'sympathy', labelKey: 'sympathy' as const },
] as const;

const COLOR_OPTIONS = ['red', 'pink', 'white', 'yellow', 'purple', 'orange', 'mixed'] as const;
const FLOWER_TYPE_OPTIONS = ['rose', 'tulip', 'lily', 'orchid', 'sunflower', 'mixed'] as const;
const OCCASION_OPTIONS = [
  { value: '', labelEn: 'Any' },
  { value: 'birthday', labelEn: 'Birthday' },
  { value: 'anniversary', labelEn: 'Anniversary' },
  { value: 'romantic', labelEn: 'Romantic' },
  { value: 'sympathy', labelEn: 'Sympathy' },
  { value: 'congrats', labelEn: 'Congratulations' },
  { value: 'get_well', labelEn: 'Get well' },
] as const;

const SIZE_KEYS: SizeKey[] = ['s', 'm', 'l', 'xl'];

const defaultSizes: Array<BouquetSize & { preparationTime?: number; availability?: boolean }> = [
  { key: 's', label: 'S', price: 0, description: '', preparationTime: undefined, availability: true },
  { key: 'm', label: 'M', price: 0, description: '', preparationTime: undefined, availability: true },
  { key: 'l', label: 'L', price: 0, description: '', preparationTime: undefined, availability: true },
  { key: 'xl', label: 'XL', price: 0, description: '', preparationTime: undefined, availability: true },
];

export interface BouquetFormProps {
  lang: Locale;
  partnerId: string;
  bouquetId?: string;
  initial?: {
    nameEn: string;
    nameTh: string;
    descriptionEn: string;
    descriptionTh: string;
    compositionEn: string;
    compositionTh: string;
    category: string;
    colors?: string[];
    flowerTypes?: string[];
    occasion?: string;
    sizes: Array<BouquetSize & { preparationTime?: number; availability?: boolean }>;
  };
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  submitLabel: string;
  backHref: string;
  backLabel: string;
}

export function BouquetForm({
  lang,
  partnerId,
  bouquetId,
  initial,
  action,
  submitLabel,
  backHref,
  backLabel,
}: BouquetFormProps) {
  const t = translations[lang].partner;
  const categories = translations[lang].categories;
  const [sizes, setSizes] = useState<Array<BouquetSize & { preparationTime?: number; availability?: boolean }>>(
    initial?.sizes?.length ? initial.sizes : defaultSizes
  );
  const [error, setError] = useState<string | null>(null);

  const sizesJson = JSON.stringify(
    sizes.map((s) => ({
      key: s.key,
      label: s.label,
      price: s.price,
      description: s.description,
      preparationTime: s.preparationTime,
      availability: s.availability,
    }))
  );

  const updateSize = useCallback((index: number, field: string, value: string | number | boolean) => {
    setSizes((prev) => {
      const next = [...prev];
      const s = { ...next[index] };
      if (field === 'price' || field === 'preparationTime') (s as Record<string, unknown>)[field] = Number(value);
      else if (field === 'availability') (s as Record<string, unknown>)[field] = value === true || value === 'on';
      else (s as Record<string, unknown>)[field] = value;
      next[index] = s;
      return next;
    });
  }, []);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const json = JSON.stringify(
      sizes.map((s) => ({
        key: s.key,
        label: s.label,
        price: s.price,
        description: s.description,
        preparationTime: s.preparationTime,
        availability: s.availability,
      }))
    );
    formData.set('sizes', json);
    const colors = formData.getAll('colors') as string[];
    const flowerTypes = formData.getAll('flowerTypes') as string[];
    if (colors.length) formData.set('colors', colors.join(','));
    if (flowerTypes.length) formData.set('flowerTypes', flowerTypes.join(','));
    const result = await action(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={handleSubmit} className="partner-form partner-bouquet-form-grid">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="partnerId" value={partnerId} />
      {bouquetId && <input type="hidden" name="bouquetId" value={bouquetId} />}
      <input type="hidden" name="sizes" value={sizesJson} />

      {error && <p className="partner-error" role="alert">{error}</p>}

      <label>
        {t.nameEn} <span aria-hidden="true">*</span>
        <input type="text" name="nameEn" required defaultValue={initial?.nameEn} />
      </label>
      <label>
        {t.nameTh}
        <input type="text" name="nameTh" defaultValue={initial?.nameTh} />
      </label>
      <label>
        {t.descriptionEn}
        <textarea name="descriptionEn" rows={2} defaultValue={initial?.descriptionEn} />
      </label>
      <label>
        {t.descriptionTh}
        <textarea name="descriptionTh" rows={2} defaultValue={initial?.descriptionTh} />
      </label>
      <label>
        {t.compositionEn}
        <input type="text" name="compositionEn" defaultValue={initial?.compositionEn} placeholder="e.g. Red roses, eucalyptus" />
      </label>
      <label>
        {t.compositionTh}
        <input type="text" name="compositionTh" defaultValue={initial?.compositionTh} />
      </label>
      <label>
        {t.category}
        <select name="category" defaultValue={initial?.category || 'mixed'}>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {categories[opt.labelKey]}
            </option>
          ))}
        </select>
      </label>
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend>{t.colors}</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {COLOR_OPTIONS.map((value) => (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="checkbox"
                name="colors"
                value={value}
                defaultChecked={initial?.colors?.includes(value)}
              />
              <span style={{ textTransform: 'capitalize' }}>{value}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend>{t.flowerTypes}</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {FLOWER_TYPE_OPTIONS.map((value) => (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="checkbox"
                name="flowerTypes"
                value={value}
                defaultChecked={initial?.flowerTypes?.includes(value)}
              />
              <span style={{ textTransform: 'capitalize' }}>{value}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        {t.occasion}
        <select name="occasion" defaultValue={initial?.occasion ?? ''}>
          {OCCASION_OPTIONS.map((opt) => (
            <option key={opt.value || '_any'} value={opt.value}>
              {opt.labelEn}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t.images} <span aria-hidden="true">*</span>
        <input type="file" name="image1" accept="image/*" />
        <input type="file" name="image2" accept="image/*" />
        <input type="file" name="image3" accept="image/*" />
        <span className="partner-file-hint">{bouquetId ? 'Leave empty to keep existing images.' : 'Upload at least 1 image (max 3).'}</span>
      </label>

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: 8 }}>{t.sizes}</legend>
        {sizes.map((s, i) => (
          <div key={s.key} className="partner-sizes-row" style={{ marginBottom: 12 }}>
            <label>
              {t.sizeKey}
              <input
                type="text"
                value={s.key}
                readOnly
                disabled
                style={{ textTransform: 'uppercase', maxWidth: 48 }}
              />
            </label>
            <label>
              {t.label}
              <input
                type="text"
                value={s.label}
                onChange={(e) => updateSize(i, 'label', e.target.value)}
                placeholder="S"
              />
            </label>
            <label>
              {t.price}
              <input
                type="number"
                min={0}
                value={s.price || ''}
                onChange={(e) => updateSize(i, 'price', e.target.value)}
              />
            </label>
            <label>
              {t.preparationTime}
              <input
                type="number"
                min={0}
                value={s.preparationTime ?? ''}
                onChange={(e) => updateSize(i, 'preparationTime', e.target.value)}
                placeholder="min"
              />
            </label>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={s.availability !== false}
                onChange={(e) => updateSize(i, 'availability', e.target.checked)}
              />
              {t.availability}
            </label>
            <label>
              Desc
              <input
                type="text"
                value={s.description}
                onChange={(e) => updateSize(i, 'description', e.target.value)}
                placeholder="e.g. 7 stems"
              />
            </label>
          </div>
        ))}
      </fieldset>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
        <button type="submit" className="partner-submit">
          {submitLabel}
        </button>
        <Link href={backHref} className="partner-add-size" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {backLabel}
        </Link>
      </div>
    </form>
  );
}
