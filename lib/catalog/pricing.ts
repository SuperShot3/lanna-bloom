/**
 * Catalog bouquet pricing types, migration helpers, and sellable-option builders.
 */
import type { Locale } from '@/lib/i18n';
import {
  friendlyLegacyLabel,
  labelSingleStemCount,
  type BouquetSellableOption,
  type SizeKey,
} from '@/lib/bouquetOptions';
import type { CatalogBouquetPricing } from '@/lib/catalog/types';

export type PricingType = 'single_price' | 'size_based' | 'stem_count';

/** @deprecated Pre-migration product_kind values */
export type LegacyProductKind =
  | 'legacy'
  | 'single_stem_count'
  | 'fixed_bouquet'
  | 'customizable_bouquet';

export const SIZE_KEYS: SizeKey[] = ['s', 'm', 'l', 'xl'];

export const DEFAULT_SIZE_LABELS: Record<SizeKey, { en: string; th: string }> = {
  s: { en: 'Small', th: 'เล็ก' },
  m: { en: 'Medium', th: 'กลาง' },
  l: { en: 'Large', th: 'ใหญ่' },
  xl: { en: 'Extra large', th: 'ใหญ่พิเศษ' },
};

export type CatalogSizePricingRow = {
  key: SizeKey;
  enabled?: boolean;
  price?: number;
  labelEn?: string;
  labelTh?: string;
  label?: string;
  description?: string;
  preparationTime?: number;
  availability?: boolean;
  /** Preserved legacy optionId for cart compatibility (e.g. legacy_s, fixed_standard) */
  legacyOptionId?: string;
};

export type CatalogStemPricingRow = {
  stemCount: number;
  price: number;
  labelEn?: string;
  labelTh?: string;
  preparationTime?: number;
  availability?: boolean;
};

export type NormalizedBouquetPricing = {
  price?: number;
  sizes?: CatalogSizePricingRow[];
  stemOptions?: CatalogStemPricingRow[];
};

export function stemVariantKey(stemCount: number): string {
  return `stem_${stemCount}`;
}

export function resolvePricingType(row: {
  pricing_type?: PricingType | null;
  /** @deprecated Only present before DB migration */
  product_kind?: LegacyProductKind | string | null;
  pricing?: CatalogBouquetPricing | null;
}): PricingType {
  if (
    row.pricing_type === 'single_price' ||
    row.pricing_type === 'size_based' ||
    row.pricing_type === 'stem_count'
  ) {
    return row.pricing_type;
  }

  const kind = row.product_kind;
  const pricing = row.pricing ?? {};

  if (kind === 'single_stem_count' || (pricing.stemOptions?.length ?? 0) > 0) {
    return 'stem_count';
  }
  if ((pricing.singleStemOptions?.length ?? 0) > 0) {
    return 'stem_count';
  }
  if (kind === 'fixed_bouquet' || (pricing.fixedVariants?.length ?? 0) > 0) {
    return 'size_based';
  }
  if (kind === 'customizable_bouquet') {
    return 'single_price';
  }

  const activeSizes = countActiveSizeRows(pricing);
  if (activeSizes >= 2) return 'size_based';
  return 'single_price';
}

export function countActiveSizeRows(pricing: CatalogBouquetPricing): number {
  return (pricing.sizes ?? []).filter(
    (s) => s.enabled !== false && ((s.price ?? 0) > 0 || s.availability !== false)
  ).length;
}

/** Normalize legacy pricing JSON into the new shape (in-memory; does not write DB). */
export function normalizePricingJson(
  pricingType: PricingType,
  raw: CatalogBouquetPricing
): NormalizedBouquetPricing {
  if (pricingType === 'stem_count') {
    const stemOptions =
      raw.stemOptions?.length
        ? raw.stemOptions
        : (raw.singleStemOptions ?? []).map((o) => ({
            stemCount: o.stemCount ?? 0,
            price: o.price ?? 0,
            labelEn: o.labelEn,
            labelTh: o.labelTh,
            preparationTime: o.preparationTime,
            availability: o.availability ?? true,
          }));
    return {
      stemOptions: stemOptions
        .filter((o) => (o.stemCount ?? 0) > 0)
        .map((o) => ({
          stemCount: o.stemCount ?? 0,
          price: o.price ?? 0,
          labelEn: o.labelEn,
          labelTh: o.labelTh,
          preparationTime: o.preparationTime,
          availability: o.availability ?? true,
        })),
    };
  }

  if (pricingType === 'size_based') {
    if (raw.fixedVariants?.length) {
      return { sizes: mapFixedVariantsToSizes(raw.fixedVariants) };
    }
    const sizes = (raw.sizes ?? []).map((s) => {
      const key = normalizeSizeKey(s.key);
      return {
        key,
        enabled: s.enabled ?? ((s.price ?? 0) > 0 || s.availability !== false),
        price: s.price,
        labelEn: s.labelEn ?? (s.label && !/^(s|m|l|xl)$/i.test(s.label) ? s.label : undefined),
        labelTh: s.labelTh,
        label: s.label,
        description: s.description,
        preparationTime: s.preparationTime,
        availability: s.availability ?? true,
        legacyOptionId: key ? `legacy_${key}` : undefined,
      } satisfies CatalogSizePricingRow;
    });
    return { sizes: ensureFourSizeSlots(sizes) };
  }

  const price =
    raw.price ??
    raw.sizes?.[0]?.price ??
    raw.customTiers?.[0]?.minPrice ??
    raw.fixedVariants?.[0]?.price ??
    0;
  return { price, sizes: [] };
}

function normalizeSizeKey(key: string | undefined): SizeKey {
  const k = (key ?? 'm').toLowerCase();
  if (k === 's' || k === 'm' || k === 'l' || k === 'xl') return k;
  return 'm';
}

function mapFixedVariantsToSizes(
  variants: NonNullable<CatalogBouquetPricing['fixedVariants']>
): CatalogSizePricingRow[] {
  const keys: SizeKey[] = ['s', 'm', 'l', 'xl'];
  const rows: CatalogSizePricingRow[] = keys.map((key) => ({
    key,
    enabled: false,
    price: 0,
    availability: false,
  }));

  variants.forEach((v, i) => {
    const key = keys[Math.min(i, keys.length - 1)]!;
    const vk = v.variantKey?.trim() || `v${i}`;
    rows[i] = {
      key,
      enabled: v.availability !== false,
      price: v.price ?? 0,
      labelEn: v.nameEn,
      labelTh: v.nameTh,
      availability: v.availability ?? true,
      legacyOptionId: `fixed_${vk}`,
    };
  });

  return rows;
}

export function ensureFourSizeSlots(rows: CatalogSizePricingRow[]): CatalogSizePricingRow[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return SIZE_KEYS.map(
    (key) =>
      byKey.get(key) ?? {
        key,
        enabled: false,
        price: 0,
        availability: false,
      }
  );
}

function sizeDisplayLabel(row: CatalogSizePricingRow, lang: Locale): string {
  if (lang === 'th' && row.labelTh?.trim()) return row.labelTh.trim();
  if (row.labelEn?.trim()) return row.labelEn.trim();
  if (row.label?.trim() && !/^(s|m|l|xl)$/i.test(row.label)) return row.label.trim();
  return lang === 'th' ? DEFAULT_SIZE_LABELS[row.key].th : DEFAULT_SIZE_LABELS[row.key].en;
}

export function buildSellableOptionsFromPricing(
  pricingType: PricingType,
  pricing: CatalogBouquetPricing,
  lang: Locale = 'en'
): BouquetSellableOption[] {
  const normalized = normalizePricingJson(pricingType, pricing);

  if (pricingType === 'single_price') {
    const price = normalized.price ?? pricing.price ?? pricing.sizes?.[0]?.price ?? 0;
    return [
      {
        optionId: 'single_default',
        price,
        label: lang === 'th' ? 'มาตรฐาน' : 'Standard',
        labelTh: 'มาตรฐาน',
        availability: true,
      },
    ];
  }

  if (pricingType === 'stem_count') {
    const tiers = normalized.stemOptions ?? [];
    return tiers
      .filter((o) => o.availability !== false && o.stemCount > 0)
      .map((o, i) => ({
        optionId: `stem_${o.stemCount}_${i}`,
        stemCount: o.stemCount,
        price: o.price ?? 0,
        label: labelSingleStemCount('en', o.stemCount, o.labelEn, o.labelTh),
        labelTh: labelSingleStemCount('th', o.stemCount, o.labelEn, o.labelTh),
        preparationTime: o.preparationTime,
        availability: o.availability ?? true,
      }));
  }

  const rows = normalized.sizes ?? ensureFourSizeSlots([]);
  return rows
    .filter((s) => s.enabled && s.availability !== false && (s.price ?? 0) >= 0)
    .map((s) => {
      const optionId = s.legacyOptionId ?? `size_${s.key}`;
      return {
        optionId,
        key: s.key,
        price: s.price ?? 0,
        label: sizeDisplayLabel(s, 'en'),
        labelTh: sizeDisplayLabel(s, 'th'),
        description: s.description ?? '',
        preparationTime: s.preparationTime,
        availability: s.availability ?? true,
      };
    });
}

/** Legacy kinds → sellable options (pre-migration rows). */
export function buildSellableOptionsFromLegacyKind(
  productKind: LegacyProductKind,
  pricing: CatalogBouquetPricing,
  lang: Locale = 'en'
): BouquetSellableOption[] {
  if (productKind === 'single_stem_count' && pricing.singleStemOptions?.length) {
    return buildSellableOptionsFromPricing('stem_count', pricing, lang);
  }
  if (productKind === 'fixed_bouquet' && pricing.fixedVariants?.length) {
    return pricing.fixedVariants
      .filter((v) => v.availability !== false)
      .map((v, i) => {
        const vk = v.variantKey ?? `v${i}`;
        const nameEn = v.nameEn ?? '';
        const nameTh = v.nameTh ?? '';
        return {
          optionId: `fixed_${vk}`,
          price: v.price ?? 0,
          label:
            nameEn ||
            friendlyLegacyLabel(undefined, `${v.stemMin ?? ''}-${v.stemMax ?? ''}`),
          labelTh: nameTh || nameEn,
          stemMin: v.stemMin,
          stemMax: v.stemMax,
          preparationTime: v.preparationTime,
          availability: v.availability ?? true,
        };
      });
  }
  if (productKind === 'customizable_bouquet' && pricing.customTiers?.length) {
    return pricing.customTiers.map((t, i) => {
      const mp = t.minPrice ?? 0;
      return {
        optionId: `custom_${i}_${mp}`,
        price: mp,
        label: t.labelEn?.trim() || `Custom from ฿${mp}`,
        labelTh: t.labelTh?.trim() || t.labelEn?.trim() || `Custom from ฿${mp}`,
        preparationTime: t.preparationTime,
        availability: t.availability ?? true,
      };
    });
  }

  const rows = pricing.sizes ?? [];
  if (!rows.length) {
    return [{ optionId: 'default', key: 'm', label: '—', price: 0, description: '' }];
  }
  return rows
    .filter((s) => s.availability !== false)
    .map((s) => {
      const key = normalizeSizeKey(s.key);
      const friendly = friendlyLegacyLabel(s.label, s.description);
      return {
        optionId: `legacy_${key}`,
        key,
        price: s.price ?? 0,
        label: friendly,
        labelTh: friendly,
        description: s.description ?? '',
        preparationTime: s.preparationTime,
        availability: s.availability ?? true,
      };
    });
}

export function buildSellableOptions(
  row: {
    pricing_type?: PricingType | null;
    product_kind?: LegacyProductKind | string | null;
    pricing: CatalogBouquetPricing;
  },
  lang: Locale = 'en'
): BouquetSellableOption[] {
  const pricingType = resolvePricingType(row);
  const options = buildSellableOptionsFromPricing(pricingType, row.pricing, lang);
  if (options.length > 0 && !(options.length === 1 && options[0]!.optionId === 'default')) {
    return options;
  }

  if (row.product_kind && row.product_kind !== 'legacy') {
    return buildSellableOptionsFromLegacyKind(row.product_kind as LegacyProductKind, row.pricing, lang);
  }

  return options.length ? options : [{ optionId: 'default', key: 'm', label: '—', price: 0 }];
}

/** List / cart base price from pricing config (minimum active sellable option). */
export function primaryCatalogPriceFromPricing(
  pricingType: PricingType,
  pricing: CatalogBouquetPricing
): number {
  const options = buildSellableOptionsFromPricing(pricingType, pricing);
  const active = options.filter((o) => o.availability !== false);
  if (!active.length) {
    return pricing.price ?? pricing.sizes?.[0]?.price ?? 0;
  }
  return Math.min(...active.map((o) => o.price));
}

export function pricingPayloadForSave(
  pricingType: PricingType,
  input: {
    singlePrice?: number;
    sizes?: CatalogSizePricingRow[];
    stemOptions?: CatalogStemPricingRow[];
  }
): CatalogBouquetPricing {
  if (pricingType === 'single_price') {
    const price = input.singlePrice ?? 0;
    return {
      price,
      sizes: [
        {
          key: 'm',
          enabled: true,
          price,
          labelEn: 'Standard',
          availability: true,
        },
      ],
    };
  }
  if (pricingType === 'stem_count') {
    return {
      stemOptions: (input.stemOptions ?? []).map((o) => ({
        stemCount: o.stemCount,
        price: o.price,
        labelEn: o.labelEn,
        labelTh: o.labelTh,
        preparationTime: o.preparationTime,
        availability: o.availability ?? true,
      })),
    };
  }
  return {
    sizes: (input.sizes ?? []).map((s) => ({
      key: s.key,
      enabled: s.enabled ?? false,
      price: s.price,
      labelEn: s.labelEn,
      labelTh: s.labelTh,
      label: s.label,
      description: s.description,
      preparationTime: s.preparationTime,
      availability: s.availability,
      legacyOptionId: s.legacyOptionId,
    })),
  };
}
