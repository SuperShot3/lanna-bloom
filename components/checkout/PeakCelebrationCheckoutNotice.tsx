'use client';

import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { formatPeakCelebrationTemplate } from '@/lib/promo/peakCelebrationMessages';
import {
  getActivePeakCelebrationNotice,
  getPeakCelebrationRuleForDeliveryDate,
  peakCelebrationMinOrderShortfall,
} from '@/lib/promo/peakCelebrationPricing';

export function PeakCelebrationCheckoutNotice({
  lang,
  deliveryDateYmd,
  itemsTotal,
}: {
  lang: Locale;
  deliveryDateYmd?: string;
  itemsTotal: number;
}) {
  const copy = translations[lang].peakCelebration ?? translations.en.peakCelebration;
  const deliveryDate = deliveryDateYmd?.trim() ?? '';
  const activeRule = deliveryDate ? getPeakCelebrationRuleForDeliveryDate(deliveryDate) : null;
  const noticeRule = getActivePeakCelebrationNotice();

  if (!activeRule && !noticeRule) return null;

  if (activeRule) {
    const shortfall = peakCelebrationMinOrderShortfall(itemsTotal, deliveryDate);
    return (
      <div className="co-peak-notice co-peak-notice--active" role="status">
        <p className="co-peak-notice__text">
          {formatPeakCelebrationTemplate(lang, copy.checkoutActiveNotice, activeRule)}
        </p>
        {shortfall > 0 ? (
          <p className="co-peak-notice__warn">
            {formatPeakCelebrationTemplate(lang, copy.checkoutMinOrderWarning, activeRule).replace(
              '{remaining}',
              String(shortfall)
            )}
          </p>
        ) : null}
        <style jsx>{`
          .co-peak-notice {
            margin: 0 0 12px;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.45;
          }
          .co-peak-notice--active {
            color: var(--text);
            background: color-mix(in srgb, var(--pastel-cream) 70%, #fff);
            border: 1px solid color-mix(in srgb, #5c4a1f 30%, var(--border));
          }
          .co-peak-notice__text {
            margin: 0;
            font-weight: 500;
          }
          .co-peak-notice__warn {
            margin: 8px 0 0;
            font-weight: 600;
            color: color-mix(in srgb, #5c4a1f 75%, var(--text));
          }
        `}</style>
      </div>
    );
  }

  if (noticeRule) {
    return (
      <div className="co-peak-notice co-peak-notice--advance" role="status">
        <p className="co-peak-notice__text">
          {formatPeakCelebrationTemplate(lang, copy.checkoutAdvanceHint, noticeRule)}
        </p>
        <Link href={`/${lang}/info/delivery-policy#peak-celebration-pricing`} className="co-peak-notice__link">
          {copy.policyLinkLabel}
        </Link>
        <style jsx>{`
          .co-peak-notice {
            margin: 0 0 12px;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.45;
          }
          .co-peak-notice--advance {
            color: var(--text);
            background: color-mix(in srgb, #5c4a1f 8%, #fff);
            border: 1px solid color-mix(in srgb, #5c4a1f 22%, var(--border));
          }
          .co-peak-notice__text {
            margin: 0;
            font-weight: 500;
          }
          .co-peak-notice__link {
            display: inline-block;
            margin-top: 6px;
            font-size: 13px;
            font-weight: 600;
            color: color-mix(in srgb, #5c4a1f 85%, var(--primary));
            text-decoration: underline;
            text-underline-offset: 2px;
          }
        `}</style>
      </div>
    );
  }

  return null;
}
