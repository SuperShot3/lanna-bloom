/**
 * Unified sellable options for bouquets (legacy S/M/L/XL + hybrid product kinds).
 * Customer-facing copy lives in `label` — never rely on optionId for display.
 */

import type { Locale } from '@/lib/i18n';

/** Legacy Sanity size keys; optional on hybrid options for cart backward compat */
export type SizeKey = 's' | 'm' | 'l' | 'xl';

export interface BouquetSellableOption {
  /** Stable id for cart merge, Stripe resolution, favorites (e.g. size_s, legacy_s, stem_19) */
  optionId: string;
  /** Set for size_based rows — enables old cart JSON and partner forms */
  key?: SizeKey;
  /** Optional per-option gallery; falls back to bouquet.images when empty */
  imageUrls?: string[];
  imageAlts?: string[];
  price: number;
  /** Shopper-facing label (default EN or shared) */
  label: string;
  /** Thai label when different from `label` */
  labelTh?: string;
  description?: string;
  preparationTime?: number;
  availability?: boolean;
  stemCount?: number;
  stemMin?: number;
  stemMax?: number;
}

/** @deprecated alias — use BouquetSellableOption */
export type BouquetSize = BouquetSellableOption;

/** @deprecated Use PricingType from lib/catalog/pricing */
export type ProductKind = 'legacy' | 'single_stem_count' | 'fixed_bouquet' | 'customizable_bouquet';

export type { PricingType } from '@/lib/catalog/pricing';

const LEGACY_LETTER = /^(S|M|L|XL|X|L)$/i;

/** Prefer description over S/M/L/XL letters for display */
export function friendlyLegacyLabel(label: string | undefined, description: string | undefined): string {
  const raw = (label ?? '').trim();
  const desc = (description ?? '').trim();
  if (raw && !LEGACY_LETTER.test(raw) && raw.length > 1) return raw;
  if (desc) {
    const first = desc.split(/[.;,\n]/)[0]?.trim();
    if (first) return first;
  }
  if (raw) return raw;
  return '—';
}

export function minPriceFromOptions(sizes: BouquetSellableOption[]): number {
  if (!sizes?.length) return 0;
  return Math.min(...sizes.map((s) => s.price ?? Infinity));
}

/** Stem filter buckets (URL param stemBucket) */
export const STEM_BUCKET_RANGES = {
  small: { min: 6, max: 10 },
  medium: { min: 11, max: 20 },
  large: { min: 21, max: 30 },
  grand: { min: 31, max: 9999 },
} as const;

export type StemBucketKey = keyof typeof STEM_BUCKET_RANGES;

export function optionOverlapsStemBucket(
  opt: BouquetSellableOption,
  bucket: StemBucketKey
): boolean {
  const r = STEM_BUCKET_RANGES[bucket];
  if (opt.stemCount != null) {
    return opt.stemCount >= r.min && opt.stemCount <= r.max;
  }
  if (opt.stemMin != null || opt.stemMax != null) {
    const lo = opt.stemMin ?? opt.stemMax ?? 0;
    const hi = opt.stemMax ?? opt.stemMin ?? lo;
    return hi >= r.min && lo <= r.max;
  }
  return false;
}

export function bouquetMatchesStemBucket(
  sizes: BouquetSellableOption[],
  bucket: StemBucketKey | undefined
): boolean {
  if (!bucket) return true;
  return sizes.some((s) => optionOverlapsStemBucket(s, bucket));
}

export function labelSingleStemCount(lang: Locale, stemCount: number, labelEn?: string, labelTh?: string): string {
  if (lang === 'th' && labelTh?.trim()) return labelTh.trim();
  if (labelEn?.trim()) return labelEn.trim();
  return lang === 'th' ? `กุหลาบ ${stemCount} ดอก` : `${stemCount} roses`;
}

export function labelFixedVariant(lang: Locale, nameEn: string, nameTh: string, stemMin?: number, stemMax?: number): string {
  const name = lang === 'th' && nameTh.trim() ? nameTh.trim() : nameEn.trim();
  if (stemMin != null && stemMax != null) {
    return lang === 'th'
      ? `${name} (ประมาณ ${stemMin}–${stemMax} ดอก)`
      : `${name} (approx. ${stemMin}–${stemMax} stems)`;
  }
  if (stemMin != null) {
    return lang === 'th' ? `${name} (ประมาณ ${stemMin}+ ดอก)` : `${name} (approx. ${stemMin}+ stems)`;
  }
  return name;
}

/** Resolve cart / API size string (optionId or legacy s/m/l/xl) to a sellable option */
export function resolveBouquetOptionFromIdentifier(
  bouquet: { sizes: BouquetSellableOption[] },
  raw: string | undefined
): BouquetSellableOption | undefined {
  const sizes = bouquet.sizes ?? [];
  if (!sizes.length) return undefined;
  const r = (raw ?? '').trim();
  if (!r) return sizes[0];
  const byId = sizes.find((s) => s.optionId === r);
  if (byId) return byId;

  const lower = r.toLowerCase();
  if (lower.startsWith('legacy_') || lower.startsWith('size_') || lower.startsWith('fixed_')) {
    const suffix = lower.replace(/^(legacy_|size_|fixed_)/, '');
    const byKey = sizes.find(
      (s) =>
        s.optionId === r ||
        s.optionId === `legacy_${suffix}` ||
        s.optionId === `size_${suffix}` ||
        s.optionId === `fixed_${suffix}` ||
        s.key === suffix
    );
    if (byKey) return byKey;
  }

  const byLabel = sizes.find(
    (s) => s.label.toLowerCase() === lower || s.labelTh?.toLowerCase() === lower
  );
  if (byLabel) return byLabel;

  if (lower === 'single_default' || lower === 'default') {
    return sizes.find((s) => s.optionId === 'single_default') ?? sizes[0];
  }

  if (lower === 's' || lower === 'm' || lower === 'l' || lower === 'xl') {
    return (
      sizes.find((s) => s.key === lower) ??
      sizes.find((s) => s.optionId === `legacy_${lower}`) ??
      sizes.find((s) => s.optionId === `size_${lower}`) ??
      sizes[0]
    );
  }

  if (lower.startsWith('stem_')) {
    const byStem = sizes.find((s) => s.optionId === r || s.optionId.startsWith(lower.split('_').slice(0, 2).join('_')));
    if (byStem) return byStem;
  }

  if (lower.startsWith('custom_')) {
    const byCustom = sizes.find((s) => s.optionId === r);
    if (byCustom) return byCustom;
  }

  return sizes[0];
}

export function optionDisplayLabel(opt: BouquetSellableOption, lang: Locale): string {
  if (lang === 'th' && opt.labelTh?.trim()) return opt.labelTh.trim();
  return opt.label;
}

export function labelCustomTier(lang: Locale, minPrice: number, labelEn?: string, labelTh?: string): string {
  if (lang === 'th' && labelTh?.trim()) return labelTh.trim();
  if (labelEn?.trim()) return labelEn.trim();
  return lang === 'th'
    ? `ช่อตามงบ เริ่มต้น ฿${minPrice.toLocaleString()}`
    : `Custom bouquet from ฿${minPrice.toLocaleString()}`;
}
