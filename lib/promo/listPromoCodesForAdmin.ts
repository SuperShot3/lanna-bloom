/**
 * Read-only promo catalog for admin Reviews & Coupons page.
 * Sourced from existing allowlist + campaign modules (no DB).
 */

import {
  getDiscountCodeDefinition,
  listAllowlistedDiscountCodes,
  CART_FIVE_PERCENT_CODE,
} from '@/lib/referral';
import {
  MAY_FREE_DELIVERY_CODE,
  MAY_FREE_DELIVERY_END_YMD,
  MAY_FREE_DELIVERY_MIN_ITEMS_THB,
  MAY_FREE_DELIVERY_START_YMD,
} from '@/lib/promo/campaigns';
import {
  LANNA_BLOOM_COUPON_ACTIVE,
  LANNA_BLOOM_COUPON_EXPIRES_YMD,
  LANNA_BLOOM_COUPON_TIERS,
  isLannaBloomCouponCode,
} from '@/lib/promo/lannaBloomCoupon';
import { SHOP_TIMEZONE, shopTodayYmd } from '@/lib/shopTime';

export type AdminPromoStatus = 'active' | 'inactive' | 'expired' | 'scheduled';

export interface AdminPromoCodeRow {
  code: string;
  typeLabel: string;
  summary: string;
  status: AdminPromoStatus;
  expiresLabel: string;
  notes?: string;
}

function statusForYmdWindow(
  startYmd: string | null,
  endYmd: string | null,
  activeFlag: boolean,
  nowYmd: string
): AdminPromoStatus {
  if (!activeFlag) return 'inactive';
  if (endYmd && nowYmd > endYmd) return 'expired';
  if (startYmd && nowYmd < startYmd) return 'scheduled';
  return 'active';
}

export function listPromoCodesForAdmin(now: Date = new Date()): AdminPromoCodeRow[] {
  const nowYmd = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const rows: AdminPromoCodeRow[] = [];

  for (const code of listAllowlistedDiscountCodes()) {
    const def = getDiscountCodeDefinition(code);
    if (!def) continue;

    if (isLannaBloomCouponCode(code)) {
      const tiers = LANNA_BLOOM_COUPON_TIERS.map(
        (t) => `฿${t.amount} off from ฿${t.minItemsTotal}`
      ).join('; ');
      rows.push({
        code,
        typeLabel: 'Tiered fixed (items)',
        summary: tiers,
        status: statusForYmdWindow(
          null,
          LANNA_BLOOM_COUPON_EXPIRES_YMD,
          LANNA_BLOOM_COUPON_ACTIVE,
          nowYmd
        ),
        expiresLabel: LANNA_BLOOM_COUPON_EXPIRES_YMD,
        notes: 'Public coupon; cannot combine with catalog sale items or other codes',
      });
      continue;
    }

    if (code === MAY_FREE_DELIVERY_CODE) {
      rows.push({
        code,
        typeLabel: 'Free delivery (auto)',
        summary: `Free delivery when items ≥ ฿${MAY_FREE_DELIVERY_MIN_ITEMS_THB.toLocaleString()}`,
        status: statusForYmdWindow(
          MAY_FREE_DELIVERY_START_YMD,
          MAY_FREE_DELIVERY_END_YMD,
          true,
          nowYmd
        ),
        expiresLabel: `${MAY_FREE_DELIVERY_START_YMD} → ${MAY_FREE_DELIVERY_END_YMD}`,
        notes: 'Automatic campaign; not entered by customer. Beaten by a valid manual code.',
      });
      continue;
    }

    if (def.type === 'free_delivery') {
      rows.push({
        code,
        typeLabel: 'Free delivery',
        summary: 'Waives delivery fee',
        status: 'active',
        expiresLabel: 'No expiry',
      });
      continue;
    }

    if (def.type === 'percent') {
      const base = def.discountBase === 'items' ? 'items' : 'cart';
      const dest = def.allowedDeliveryDestinations?.length
        ? ` · ${def.allowedDeliveryDestinations.join(', ')} only`
        : '';
      rows.push({
        code,
        typeLabel: `Percent (${base})`,
        summary: `${def.value}% off ${base}${dest}`,
        status: 'active',
        expiresLabel: 'No expiry',
        notes:
          code === CART_FIVE_PERCENT_CODE
            ? 'One-tap cart offer'
            : def.affiliate
              ? `Affiliate: ${def.affiliate.name} (${def.affiliate.commissionPercent}%)`
              : undefined,
      });
      continue;
    }

    if (def.type === 'fixed') {
      rows.push({
        code,
        typeLabel: 'Fixed',
        summary: `฿${def.value} off`,
        status: 'active',
        expiresLabel: 'No expiry',
      });
    }
  }

  // Stable sort: active first, then by code
  const rank: Record<AdminPromoStatus, number> = {
    active: 0,
    scheduled: 1,
    inactive: 2,
    expired: 3,
  };
  rows.sort((a, b) => rank[a.status] - rank[b.status] || a.code.localeCompare(b.code));
  return rows;
}

export function adminPromoStatusLabel(status: AdminPromoStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'expired':
      return 'Expired';
    case 'scheduled':
      return 'Scheduled';
  }
}

/** Today in shop TZ — useful for the admin hint line. */
export function adminPromoCatalogAsOf(): string {
  return shopTodayYmd();
}
