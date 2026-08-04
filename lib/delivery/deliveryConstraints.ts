/**
 * Province + product delivery constraints (Feature 3).
 * Client- and server-safe pure helpers; shop-hour slot lead still applies on top.
 */

import {
  addDaysToYmd,
  DELIVERY_SHOP_TIMEZONE,
  getBangkokYmd,
} from '@/lib/deliveryHours';
import type { ProvinceStatus } from '@/lib/provinces/types';

function minutesSinceMidnightBangkok(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DELIVERY_SHOP_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

/** Default advance when status is preorder_only and min_advance_notice_hours is null. */
export const PREORDER_DEFAULT_ADVANCE_HOURS = 48;

export type DeliveryConstraintReasonCode =
  | 'ok'
  | 'coming_soon'
  | 'temporarily_unavailable'
  | 'catalog_disabled'
  | 'next_day'
  | 'preorder'
  | 'advance_notice'
  | 'same_day_cutoff'
  | 'product_next_day';

export type DeliveryConstraint = {
  orderingAllowed: boolean;
  /** Earliest selectable calendar date (YYYY-MM-DD). Null when ordering is blocked. */
  earliestYmd: string | null;
  sameDayCutoffLocal: string | null;
  reasonCode: DeliveryConstraintReasonCode;
  customerMessageEn: string | null;
  customerMessageTh: string | null;
  deliveryLimitationsEn: string | null;
  deliveryLimitationsTh: string | null;
};

/** Fields needed from a province row / PublicProvince (null = no row → shop-hours only). */
export type ProvinceConstraintInput = {
  status: ProvinceStatus;
  catalog_enabled: boolean;
  min_advance_notice_hours: number | null;
  same_day_cutoff_local: string | null;
  customer_message_en?: string | null;
  customer_message_th?: string | null;
  delivery_limitations_en?: string | null;
  delivery_limitations_th?: string | null;
} | null;

export type CartLineDeliveryConstraintInput = {
  itemType?: 'bouquet' | 'product' | 'plushyToy' | 'balloon';
  /** Catalog delivery_options; missing/empty on bouquets = same-day capable (legacy). */
  deliveryOptions?: string[] | null;
};

function maxYmd(a: string, b: string): string {
  return a >= b ? a : b;
}

/** Bangkok calendar date of `now + hours`. */
export function earliestYmdFromAdvanceHours(now: Date, hours: number): string {
  if (hours <= 0) return getBangkokYmd(now);
  return getBangkokYmd(new Date(now.getTime() + hours * 60 * 60 * 1000));
}

export function parseCutoffLocalToMinutes(cutoff: string): number | null {
  const m = cutoff.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Product tags → date floor across cart lines (strictest wins).
 * Non-bouquet lines ignored. Empty/missing options = same-day capable.
 * Options present without `same_day` → earliest ≥ tomorrow.
 */
export function productEarliestYmdFromCartLines(
  cartLines: CartLineDeliveryConstraintInput[],
  todayYmd: string
): { earliestYmd: string | null; reasonCode: DeliveryConstraintReasonCode | null } {
  let needsTomorrow = false;
  for (const line of cartLines) {
    if ((line.itemType ?? 'bouquet') !== 'bouquet') continue;
    const opts = line.deliveryOptions;
    if (!opts || opts.length === 0) continue;
    if (opts.includes('same_day')) continue;
    needsTomorrow = true;
  }
  if (!needsTomorrow) return { earliestYmd: null, reasonCode: null };
  return {
    earliestYmd: addDaysToYmd(todayYmd, 1),
    reasonCode: 'product_next_day',
  };
}

function provinceFloor(
  province: NonNullable<ProvinceConstraintInput>,
  now: Date,
  todayYmd: string
): {
  orderingAllowed: boolean;
  earliestYmd: string | null;
  sameDayCutoffLocal: string | null;
  reasonCode: DeliveryConstraintReasonCode;
} {
  if (!province.catalog_enabled) {
    return {
      orderingAllowed: false,
      earliestYmd: null,
      sameDayCutoffLocal: null,
      reasonCode: 'catalog_disabled',
    };
  }

  if (province.status === 'coming_soon') {
    return {
      orderingAllowed: false,
      earliestYmd: null,
      sameDayCutoffLocal: null,
      reasonCode: 'coming_soon',
    };
  }

  if (province.status === 'temporarily_unavailable') {
    return {
      orderingAllowed: false,
      earliestYmd: null,
      sameDayCutoffLocal: null,
      reasonCode: 'temporarily_unavailable',
    };
  }

  const tomorrowYmd = addDaysToYmd(todayYmd, 1);
  const advanceHours =
    province.min_advance_notice_hours ??
    (province.status === 'preorder_only' ? PREORDER_DEFAULT_ADVANCE_HOURS : null);

  let earliest = todayYmd;
  let reasonCode: DeliveryConstraintReasonCode = 'ok';

  if (advanceHours != null && advanceHours > 0) {
    earliest = maxYmd(earliest, earliestYmdFromAdvanceHours(now, advanceHours));
    if (earliest > todayYmd) {
      reasonCode =
        province.status === 'preorder_only'
          ? 'preorder'
          : advanceHours >= 24
            ? 'advance_notice'
            : reasonCode;
    }
  }

  if (province.status === 'next_day' || province.status === 'preorder_only') {
    earliest = maxYmd(earliest, tomorrowYmd);
    if (reasonCode === 'ok') {
      reasonCode = province.status === 'preorder_only' ? 'preorder' : 'next_day';
    }
  }

  let sameDayCutoffLocal: string | null = null;
  if (province.status === 'same_day' && province.same_day_cutoff_local) {
    sameDayCutoffLocal = province.same_day_cutoff_local;
    const cutoffMin = parseCutoffLocalToMinutes(province.same_day_cutoff_local);
    if (cutoffMin != null && minutesSinceMidnightBangkok(now) >= cutoffMin) {
      earliest = maxYmd(earliest, tomorrowYmd);
      if (earliest > todayYmd && reasonCode === 'ok') {
        reasonCode = 'same_day_cutoff';
      }
    }
  }

  return {
    orderingAllowed: true,
    earliestYmd: earliest,
    sameDayCutoffLocal,
    reasonCode,
  };
}

/**
 * Merge shop-hours floor (today), province status/advance/cutoff, and product tags.
 * Strictest wins: orderingAllowed = AND; earliestYmd = max of floors.
 */
export function computeDeliveryConstraint(params: {
  province: ProvinceConstraintInput;
  cartLines?: CartLineDeliveryConstraintInput[];
  now?: Date;
}): DeliveryConstraint {
  const now = params.now ?? new Date();
  const todayYmd = getBangkokYmd(now);
  const emptyMessages = {
    customerMessageEn: null as string | null,
    customerMessageTh: null as string | null,
    deliveryLimitationsEn: null as string | null,
    deliveryLimitationsTh: null as string | null,
  };

  const messagesFromProvince = (p: NonNullable<ProvinceConstraintInput>) => ({
    customerMessageEn: p.customer_message_en ?? null,
    customerMessageTh: p.customer_message_th ?? null,
    deliveryLimitationsEn: p.delivery_limitations_en ?? null,
    deliveryLimitationsTh: p.delivery_limitations_th ?? null,
  });

  let orderingAllowed = true;
  let earliestYmd: string = todayYmd;
  let sameDayCutoffLocal: string | null = null;
  let reasonCode: DeliveryConstraintReasonCode = 'ok';
  let messages = emptyMessages;

  if (params.province) {
    const pf = provinceFloor(params.province, now, todayYmd);
    messages = messagesFromProvince(params.province);
    if (!pf.orderingAllowed) {
      return {
        orderingAllowed: false,
        earliestYmd: null,
        sameDayCutoffLocal: null,
        reasonCode: pf.reasonCode,
        ...messages,
      };
    }
    earliestYmd = pf.earliestYmd ?? todayYmd;
    sameDayCutoffLocal = pf.sameDayCutoffLocal;
    reasonCode = pf.reasonCode;
  }

  const productFloor = productEarliestYmdFromCartLines(params.cartLines ?? [], todayYmd);
  if (productFloor.earliestYmd) {
    const before = earliestYmd;
    earliestYmd = maxYmd(earliestYmd, productFloor.earliestYmd);
    if (earliestYmd > before && (reasonCode === 'ok' || reasonCode === 'same_day_cutoff')) {
      reasonCode = productFloor.reasonCode ?? 'product_next_day';
    } else if (earliestYmd === productFloor.earliestYmd && reasonCode === 'ok') {
      reasonCode = productFloor.reasonCode ?? 'product_next_day';
    }
  }

  return {
    orderingAllowed,
    earliestYmd,
    sameDayCutoffLocal,
    reasonCode,
    ...messages,
  };
}

/** English fallback copy for reason codes (UI may prefer province messages). */
export function deliveryConstraintFallbackMessageEn(
  reasonCode: DeliveryConstraintReasonCode
): string {
  switch (reasonCode) {
    case 'coming_soon':
      return 'Delivery to this area is coming soon.';
    case 'temporarily_unavailable':
    case 'catalog_disabled':
      return 'Delivery is not available for this area right now.';
    case 'next_day':
    case 'product_next_day':
      return 'Delivery in this area requires at least one day of advance notice.';
    case 'preorder':
      return 'This area currently requires advance ordering.';
    case 'advance_notice':
      return 'Please choose a later delivery date for this area.';
    case 'same_day_cutoff':
      return 'Same-day ordering has closed for today. Please choose tomorrow or a later date.';
    case 'ok':
    default:
      return '';
  }
}

export function deliveryConstraintFallbackMessageTh(
  reasonCode: DeliveryConstraintReasonCode
): string {
  switch (reasonCode) {
    case 'coming_soon':
      return 'พื้นที่นี้จะเปิดให้จัดส่งเร็วๆ นี้';
    case 'temporarily_unavailable':
    case 'catalog_disabled':
      return 'ขณะนี้ยังไม่สามารถจัดส่งในพื้นที่นี้ได้';
    case 'next_day':
    case 'product_next_day':
      return 'พื้นที่นี้ต้องสั่งล่วงหน้าอย่างน้อย 1 วัน';
    case 'preorder':
      return 'พื้นที่นี้ต้องสั่งล่วงหน้า';
    case 'advance_notice':
      return 'กรุณาเลือกวันจัดส่งที่ช้ากว่านี้สำหรับพื้นที่นี้';
    case 'same_day_cutoff':
      return 'หมดเวลาสั่งส่งวันเดียวกันแล้ว กรุณาเลือกวันพรุ่งนี้หรือวันถัดไป';
    case 'ok':
    default:
      return '';
  }
}

/** Prefer province customer/limitation copy; else i18n-style fallback by reason. */
export function resolveDeliveryConstraintNotice(
  constraint: DeliveryConstraint,
  lang: string
): string | null {
  const isTh = lang === 'th';
  if (constraint.reasonCode === 'ok' && constraint.orderingAllowed) {
    const limitation = isTh
      ? constraint.deliveryLimitationsTh?.trim()
      : constraint.deliveryLimitationsEn?.trim();
    if (limitation) return limitation;
    return null;
  }

  const message = isTh
    ? constraint.customerMessageTh?.trim() || constraint.deliveryLimitationsTh?.trim()
    : constraint.customerMessageEn?.trim() || constraint.deliveryLimitationsEn?.trim();
  if (message) return message;

  if (!constraint.orderingAllowed || constraint.reasonCode !== 'ok') {
    return isTh
      ? deliveryConstraintFallbackMessageTh(constraint.reasonCode)
      : deliveryConstraintFallbackMessageEn(constraint.reasonCode);
  }
  return null;
}
