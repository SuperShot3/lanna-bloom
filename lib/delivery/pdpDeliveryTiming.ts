/**
 * Customer-facing earliest-delivery copy for the product page.
 * Thin wrapper over Feature 3 constraints — not a second date engine.
 */

import type { Locale } from '@/lib/i18n';
import { DELIVERY_SHOP_TIMEZONE } from '@/lib/deliveryHours';
import {
  resolveDeliveryConstraintNotice,
  type DeliveryConstraint,
} from '@/lib/delivery/deliveryConstraints';

export type PdpDeliveryTimingDisplay = {
  /** Earliest delivery date line (localized). */
  timingLine: string | null;
  /** Reason / limitation notice (next-day, cutoff, blocked, etc.). */
  noticeLine: string | null;
  /** Same-day cutoff line when applicable. */
  cutoffLine: string | null;
  orderingAllowed: boolean;
  earliestYmd: string | null;
};

export type PdpDeliveryTimingCopy = {
  earliestDelivery: string;
  sameDayCutoffUntil: string;
  orderingUnavailable: string;
};

const DEFAULT_COPY: Record<'en' | 'th', PdpDeliveryTimingCopy> = {
  en: {
    earliestDelivery: 'Earliest delivery: {date}',
    sameDayCutoffUntil: 'Same-day orders until {time} (Bangkok time)',
    orderingUnavailable: 'Ordering is not available for this area right now.',
  },
  th: {
    earliestDelivery: 'จัดส่งเร็วสุด: {date}',
    sameDayCutoffUntil: 'สั่งส่งวันเดียวกันได้ถึง {time} น. (เวลาไทย)',
    orderingUnavailable: 'ขณะนี้ยังไม่สามารถสั่งจัดส่งในพื้นที่นี้ได้',
  },
};

export function formatYmdLocalizedForPdp(ymd: string, lang: Locale): string {
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

function resolveCopy(lang: Locale, override?: Partial<PdpDeliveryTimingCopy>): PdpDeliveryTimingCopy {
  const base = lang === 'th' ? DEFAULT_COPY.th : DEFAULT_COPY.en;
  return { ...base, ...override };
}

/**
 * Format earliest delivery + notices from an existing DeliveryConstraint.
 */
export function formatPdpDeliveryTiming(
  constraint: DeliveryConstraint,
  lang: Locale,
  copyOverride?: Partial<PdpDeliveryTimingCopy>
): PdpDeliveryTimingDisplay {
  const copy = resolveCopy(lang, copyOverride);

  if (!constraint.orderingAllowed) {
    const notice = resolveDeliveryConstraintNotice(constraint, lang);
    return {
      timingLine: null,
      noticeLine: notice || copy.orderingUnavailable,
      cutoffLine: null,
      orderingAllowed: false,
      earliestYmd: null,
    };
  }

  const dateLabel = constraint.earliestYmd
    ? formatYmdLocalizedForPdp(constraint.earliestYmd, lang)
    : null;

  const timingLine = dateLabel
    ? copy.earliestDelivery.replace('{date}', dateLabel)
    : null;

  const noticeLine = resolveDeliveryConstraintNotice(constraint, lang);

  let cutoffLine: string | null = null;
  if (constraint.sameDayCutoffLocal) {
    cutoffLine = copy.sameDayCutoffUntil.replace('{time}', constraint.sameDayCutoffLocal);
  }

  return {
    timingLine,
    noticeLine,
    cutoffLine,
    orderingAllowed: true,
    earliestYmd: constraint.earliestYmd,
  };
}
