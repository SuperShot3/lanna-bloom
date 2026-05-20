'use client';

import { useEffect, useState } from 'react';
import type { CheckoutStickyHeaderPayload } from '@/contexts/CheckoutStickyHeaderContext';
import { type Locale, translations } from '@/lib/i18n';
import { formatBangkokDate, formatBangkokTime } from '@/lib/deliveryHours';

const CLOCK_TICK_MS = 1_000;

export function CheckoutCompactHeaderBar({
  payload,
  lang,
}: {
  payload: CheckoutStickyHeaderPayload;
  lang: Locale;
}) {
  const thb = '\u0E3F';
  const deliveryFeeDisplay = !payload.deliveryFeeKnown
    ? payload.deliveryPendingLabel
    : payload.deliveryFeeGross != null && payload.deliveryFeeGross > payload.deliveryFee
      ? payload.deliveryFreeLabel
      : `${thb}${payload.deliveryFee.toLocaleString()}`;

  const locationLabel = translations[lang].catalog.localTimeBangkok ?? 'Chiang Mai';
  const clockTitle =
    lang === 'th' ? 'เวลาท้องถิ่น (เชียงใหม่)' : 'Local time in Chiang Mai (Asia/Bangkok)';

  return (
    <div className="checkout-compact-header" role="region" aria-label="Order summary">
      <div className="checkout-compact-header__inner">
        <div className="checkout-compact-header__main">
        <div className="checkout-compact-header__summary" aria-live="polite">
          <div className="checkout-compact-header__total-row">
            <span className="checkout-compact-header__currency">{thb}</span>
            <span className="checkout-compact-header__amount">{payload.total.toLocaleString()}</span>
            {payload.itemSummary ? (
              <>
                <span className="checkout-compact-header__divider" aria-hidden>
                  ·
                </span>
                <span className="checkout-compact-header__item-inline">
                  {payload.hasToyItem ? (
                    <span className="checkout-compact-header__bear-icon" aria-hidden>
                      🧸
                    </span>
                  ) : null}
                  <span className="checkout-compact-header__item-inline-text">{payload.itemSummary}</span>
                </span>
              </>
            ) : null}
          </div>
          <p className="checkout-compact-header__delivery-line">
            <DeliveryTruckIcon />
            <span className="checkout-compact-header__delivery-line-text">
              {payload.deliveryFeeLabel}: {deliveryFeeDisplay}
              {payload.deliveryScheduleLine ? ` · ${payload.deliveryScheduleLine}` : ''}
            </span>
          </p>
        </div>
        <div className="checkout-compact-header__trust" aria-label="Policies and trust">
          <span className="checkout-compact-header__trust-item">
            <ShieldIcon />
            <span>{payload.securePaymentLabel}</span>
          </span>
          <span className="checkout-compact-header__trust-item checkout-compact-header__trust-item--policy-note">
            <span className="checkout-compact-header__policy-note">{payload.policyHint}</span>
          </span>
        </div>
        </div>
        <CheckoutChiangMaiClock lang={lang} locationLabel={locationLabel} title={clockTitle} />
      </div>
    </div>
  );
}

function CheckoutChiangMaiClock({
  lang,
  locationLabel,
  title,
}: {
  lang: Locale;
  locationLabel: string;
  title: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="checkout-compact-header__local-time"
      title={title}
      aria-label={title}
    >
      <time className="checkout-compact-header__local-time-clock" dateTime={now?.toISOString()} suppressHydrationWarning>
        {now ? formatBangkokTime(now, lang) : '--:--'}
      </time>
      <span className="checkout-compact-header__local-time-date" suppressHydrationWarning>
        {now ? formatBangkokDate(now, lang) : '—'}
      </span>
      <span className="checkout-compact-header__local-time-label">{locationLabel}</span>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 1.5 2.5 3v2.8c0 2.5 2.3 3.9 3.5 4.7 1.2-.8 3.5-2.2 3.5-4.7V3L6 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="m4.6 5.9 1 1 1.9-2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeliveryTruckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M1.5 3.25h5.5v3.5H1.5zM7 4h2l1 1.25V6.75H7z" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="3" cy="8.5" r="0.75" fill="currentColor" />
      <circle cx="8.75" cy="8.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

