'use client';

import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { CatalogFilterParams } from '@/lib/sanity';
import { getLineContactUrl } from '@/lib/messenger';

const OCCASION_OPTIONS = [
  { value: '', labelKey: 'occasionAny' as const },
  { value: 'birthday', labelKey: 'occasionBirthday' as const },
  { value: 'anniversary', labelKey: 'occasionAnniversary' as const },
  { value: 'romantic', labelKey: 'occasionRomantic' as const },
  { value: 'sympathy', labelKey: 'occasionSympathy' as const },
  { value: 'congrats', labelKey: 'occasionCongrats' as const },
  { value: 'get_well', labelKey: 'occasionGetWell' as const },
] as const;

const TYPE_OPTIONS = [
  { value: 'rose', labelKey: 'typeRose' as const },
  { value: 'tulip', labelKey: 'typeTulip' as const },
  { value: 'lily', labelKey: 'typeLily' as const },
  { value: 'orchid', labelKey: 'typeOrchid' as const },
  { value: 'sunflower', labelKey: 'typeSunflower' as const },
  { value: 'mixed', labelKey: 'typeMixed' as const },
] as const;

export interface CatalogSidebarFiltersProps {
  lang: Locale;
  values: CatalogFilterParams;
  onApply: (params: CatalogFilterParams) => void;
  onClear: () => void;
}

export function CatalogSidebarFilters({
  lang,
  values,
  onApply,
  onClear,
}: CatalogSidebarFiltersProps) {
  const t = translations[lang].catalog;
  const occasion = values.occasion ?? '';
  const types = values.types ?? [];
  const minStr = values.min != null ? String(values.min) : '';
  const maxStr = values.max != null ? String(values.max) : '';

  const toggleType = (ty: string) => {
    const next = types.includes(ty) ? types.filter((x) => x !== ty) : [...types, ty];
    onApply({ ...values, types: next.length ? next : undefined });
  };

  const handleOccasionChange = (value: string) => {
    onApply({ ...values, occasion: value || undefined });
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const num = v ? parseInt(v, 10) : undefined;
    onApply({ ...values, min: num != null && !isNaN(num) ? num : undefined });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const num = v ? parseInt(v, 10) : undefined;
    onApply({ ...values, max: num != null && !isNaN(num) ? num : undefined });
  };

  if (values.topCategory && values.topCategory !== 'flowers') {
    return (
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 p-6 rounded-xl bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
          <Link
            href={getLineContactUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-accent text-primary font-medium hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-xl">chat</span>
            {t.chatWithUs}
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-24 space-y-6 p-6 rounded-xl bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
        <div>
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
            {t.filterOccasion}
          </h3>
          <div className="flex flex-col gap-2">
            {OCCASION_OPTIONS.map(({ value, labelKey }) => (
              <label
                key={value || 'any'}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <input
                  type="radio"
                  name="occasion"
                  checked={occasion === value}
                  onChange={() => handleOccasionChange(value)}
                  className="rounded border-stone-300 text-[#1A3C34]"
                />
                {t[labelKey]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
            {t.filterTypes}
          </h3>
          <div className="flex flex-col gap-2">
            {TYPE_OPTIONS.map(({ value, labelKey }) => (
              <label
                key={value}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={types.includes(value)}
                  onChange={() => toggleType(value)}
                  className="rounded border-stone-300 text-[#1A3C34]"
                />
                {t[labelKey]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
            {t.filterPriceRange}
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder={t.minPrice}
              value={minStr}
              onChange={handleMinChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900"
            />
            <span className="text-stone-400">–</span>
            <input
              type="number"
              min={0}
              placeholder={t.maxPrice}
              value={maxStr}
              onChange={handleMaxChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="w-full py-2 text-sm font-medium text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
        >
          {t.clearFilters}
        </button>
        <Link
          href={getLineContactUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-accent text-primary font-medium hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-xl">chat</span>
          {t.chatWithUs}
        </Link>
      </div>
    </aside>
  );
}
