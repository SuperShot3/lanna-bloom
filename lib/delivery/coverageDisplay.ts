/**
 * Customer-facing coverage copy for the Thailand map / delivery areas page.
 * Thin wrappers over Feature 3 constraints + Feature 4 shop access — not a second engine.
 */

import type { Locale } from '@/lib/i18n';
import { DELIVERY_SHOP_TIMEZONE } from '@/lib/deliveryHours';
import {
  computeDeliveryConstraint,
  resolveDeliveryConstraintNotice,
  type ProvinceConstraintInput,
} from '@/lib/delivery/deliveryConstraints';
import { catalogHrefForProvinceCode } from '@/lib/delivery/marketRoute';
import { canEnterCatalog, normalizeShopCategoryKey } from '@/lib/provinces/shopAccess';
import { PROVINCE_SEED_ROSTER } from '@/lib/provinces/seedRoster';
import type { ProvinceStatus } from '@/lib/provinces/types';

export { catalogHrefForProvinceCode };

export type CoverageProvinceInput = {
  province_code: string;
  status: ProvinceStatus;
  catalog_enabled: boolean;
  min_advance_notice_hours: number | null;
  same_day_cutoff_local: string | null;
  customer_message_en?: string | null;
  customer_message_th?: string | null;
  delivery_limitations_en?: string | null;
  delivery_limitations_th?: string | null;
  available_categories?: string[] | null;
};

const CATEGORY_LABELS: Record<string, { en: string; th: string }> = {
  flowers: { en: 'Flowers', th: 'ดอกไม้' },
  gifts: { en: 'Gifts', th: 'ของขวัญ' },
  balloons: { en: 'Balloons', th: 'ลูกโป่ง' },
  plushy_toys: { en: 'Plush toys', th: 'ของเล่นผ้า' },
};

function formatYmdLocalized(ymd: string, lang: Locale): string {
  const d = new Date(`${ymd}T12:00:00+07:00`);
  if (lang === 'th') {
    return d.toLocaleDateString('th-TH', {
      timeZone: DELIVERY_SHOP_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return d.toLocaleDateString('en-GB', {
    timeZone: DELIVERY_SHOP_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** True when seed maps this code to a non–Chiang Mai destination (or any non-CM code). */
export function isExpansionProvinceCode(provinceCode: string): boolean {
  const seed = PROVINCE_SEED_ROSTER.find((r) => r.province_code === provinceCode);
  if (seed?.destination_id === 'CHIANG_MAI') return false;
  if (provinceCode === 'chiang-mai') return false;
  if (seed?.destination_id && seed.destination_id !== 'CHIANG_MAI') return true;
  // Unmapped / no destination → treat as non-CM for category defaults
  return provinceCode !== 'chiang-mai';
}

function categoryLabel(key: string, lang: Locale): string {
  const normalized = normalizeShopCategoryKey(key);
  const labels = CATEGORY_LABELS[normalized];
  if (labels) return lang === 'th' ? labels.th : labels.en;
  return key;
}

/**
 * Shoppable categories for display (Feature 4 defaults when list empty).
 */
export function formatCoverageCategories(
  province: Pick<CoverageProvinceInput, 'province_code' | 'available_categories'>,
  lang: Locale
): string {
  const raw = province.available_categories;
  if (Array.isArray(raw) && raw.length > 0) {
    const labels = raw
      .map((k) => categoryLabel(k, lang))
      .filter(Boolean);
    return labels.join(lang === 'th' ? ' · ' : ', ');
  }

  if (isExpansionProvinceCode(province.province_code)) {
    return lang === 'th' ? 'ดอกไม้เท่านั้น' : 'Flowers only';
  }
  return lang === 'th' ? 'ดอกไม้และของขวัญ' : 'Flowers & gifts';
}

export type CoverageTimingDisplay = {
  /** Earliest delivery / blocked reason line (localized). */
  timingLine: string | null;
  /** Same-day cutoff line when applicable. */
  cutoffLine: string | null;
  /** Blocked notice when ordering not allowed (prefer province message, else fallback). */
  blockedNotice: string | null;
  orderingAllowed: boolean;
  earliestYmd: string | null;
};

/**
 * Format earliest delivery + cutoff from computeDeliveryConstraint (no cart lines).
 */
export function formatCoverageTiming(
  province: CoverageProvinceInput,
  lang: Locale,
  now: Date = new Date()
): CoverageTimingDisplay {
  const constraintInput: NonNullable<ProvinceConstraintInput> = {
    status: province.status,
    catalog_enabled: province.catalog_enabled,
    min_advance_notice_hours: province.min_advance_notice_hours,
    same_day_cutoff_local: province.same_day_cutoff_local,
    customer_message_en: province.customer_message_en,
    customer_message_th: province.customer_message_th,
    delivery_limitations_en: province.delivery_limitations_en,
    delivery_limitations_th: province.delivery_limitations_th,
  };

  const constraint = computeDeliveryConstraint({
    province: constraintInput,
    cartLines: [],
    now,
  });

  if (!constraint.orderingAllowed) {
    const notice = resolveDeliveryConstraintNotice(constraint, lang);
    return {
      timingLine: null,
      cutoffLine: null,
      blockedNotice:
        notice ||
        (lang === 'th'
          ? 'ขณะนี้ยังไม่สามารถสั่งจัดส่งในจังหวัดนี้ได้'
          : 'Ordering is not available for this province right now.'),
      orderingAllowed: false,
      earliestYmd: null,
    };
  }

  const dateLabel = constraint.earliestYmd
    ? formatYmdLocalized(constraint.earliestYmd, lang)
    : null;

  const timingLine = dateLabel
    ? lang === 'th'
      ? `จัดส่งเร็วสุด: ${dateLabel}`
      : `Earliest delivery: ${dateLabel}`
    : null;

  let cutoffLine: string | null = null;
  if (constraint.sameDayCutoffLocal) {
    cutoffLine =
      lang === 'th'
        ? `สั่งส่งวันเดียวกันได้ถึง ${constraint.sameDayCutoffLocal} น. (เวลาไทย)`
        : `Same-day orders until ${constraint.sameDayCutoffLocal} (Bangkok time)`;
  }

  return {
    timingLine,
    cutoffLine,
    blockedNotice: null,
    orderingAllowed: true,
    earliestYmd: constraint.earliestYmd,
  };
}

export type CoveragePanelDisplay = CoverageTimingDisplay & {
  shoppable: boolean;
  categoriesLine: string;
  /** Show partner-apply recruitment when catalog is not enterable. */
  showPartnerCta: boolean;
  partnerApplyHref: string;
  catalogHref: string;
  /** Short recruitment fallback when customer_message is empty. */
  partnerFallbackMessage: string;
};

export function buildCoveragePanelDisplay(
  province: CoverageProvinceInput,
  lang: Locale,
  now: Date = new Date()
): CoveragePanelDisplay {
  const shoppable = canEnterCatalog(province);
  const timing = formatCoverageTiming(province, lang, now);
  const categoriesLine = formatCoverageCategories(province, lang);

  return {
    ...timing,
    shoppable,
    categoriesLine,
    showPartnerCta: !shoppable,
    partnerApplyHref: `/${lang}/partner/apply`,
    catalogHref: catalogHrefForProvinceCode(lang, province.province_code),
    partnerFallbackMessage:
      lang === 'th'
        ? 'จังหวัดนี้ยังไม่เปิดรับออเดอร์ — สนใจเป็นพาร์ทเนอร์จัดส่งกับเราไหม?'
        : 'Delivery here is not open for orders yet — interested in partnering with us?',
  };
}

/** Sort: shoppable first, then A–Z by localized name. */
export function sortProvincesForCoverageList<
  T extends {
    province_code: string;
    province_name_en: string;
    province_name_th: string;
    status: ProvinceStatus;
    catalog_enabled: boolean;
  },
>(provinces: T[], lang: Locale): T[] {
  return [...provinces].sort((a, b) => {
    const aShop = canEnterCatalog(a) ? 0 : 1;
    const bShop = canEnterCatalog(b) ? 0 : 1;
    if (aShop !== bShop) return aShop - bShop;
    const aName = lang === 'th' ? a.province_name_th : a.province_name_en;
    const bName = lang === 'th' ? b.province_name_th : b.province_name_en;
    return aName.localeCompare(bName, lang === 'th' ? 'th' : 'en');
  });
}

export function filterProvincesBySearch<
  T extends {
    province_code: string;
    province_name_en: string;
    province_name_th: string;
  },
>(provinces: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return provinces;
  return provinces.filter((p) => {
    return (
      p.province_code.toLowerCase().includes(q) ||
      p.province_name_en.toLowerCase().includes(q) ||
      p.province_name_th.includes(query.trim()) ||
      p.province_name_th.toLowerCase().includes(q)
    );
  });
}
