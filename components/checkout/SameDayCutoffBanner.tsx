'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import {
  getSameDayOrderCutoffPhaseBangkok,
  getTomorrowBangkokDisplayDate,
  type SameDayOrderCutoffPhase,
} from '@/lib/deliveryHours';

const CLOCK_TICK_MS = 30_000;

function bannerMessage(
  phase: SameDayOrderCutoffPhase,
  lang: Locale,
  tomorrowDate: string
): string {
  const tBuyNow = translations[lang].buyNow;
  const tCatalog = translations[lang].catalog;

  switch (phase) {
    case 'before-open':
      return (
        tCatalog.deliverySameDayOpens?.replace('{time}', '09:00') ??
        'Same-day delivery from 09:00 today'
      );
    case 'before-cutoff':
      return tBuyNow.sameDayHint;
    case 'after-cutoff':
      return (
        tBuyNow.sameDayAfterCutoff?.replace('{date}', tomorrowDate) ??
        'Orders after 6 PM usually deliver tomorrow'
      );
    case 'closed':
      return (
        tCatalog.deliverySameDayNext?.replace('{date}', tomorrowDate) ??
        tCatalog.closedForSameDay ??
        'Closed for same-day — next delivery from 09:00'
      );
  }
}

function bannerTone(phase: SameDayOrderCutoffPhase): 'open' | 'warn' | 'closed' {
  if (phase === 'before-cutoff') return 'open';
  if (phase === 'closed' || phase === 'before-open') return 'closed';
  return 'warn';
}

export function SameDayCutoffBanner({ lang }: { lang: Locale }) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  if (!mounted || !now) return null;

  const phase = getSameDayOrderCutoffPhaseBangkok(now);
  const tomorrowDate = getTomorrowBangkokDisplayDate(now, lang);
  const message = bannerMessage(phase, lang, tomorrowDate);
  const tone = bannerTone(phase);

  return (
    <p className={`co-same-day-banner co-same-day-banner--${tone}`} role="status">
      {message}
      <style jsx>{`
        .co-same-day-banner {
          margin: 0 0 12px;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.45;
          font-weight: 500;
        }
        .co-same-day-banner--open {
          color: color-mix(in srgb, var(--primary) 85%, var(--text));
          background: color-mix(in srgb, var(--pastel-cream) 80%, #fff);
          border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
        }
        .co-same-day-banner--warn {
          color: var(--text);
          background: color-mix(in srgb, var(--pastel-cream) 65%, #fff);
          border: 1px solid var(--border);
        }
        .co-same-day-banner--closed {
          color: var(--text-muted);
          background: color-mix(in srgb, var(--border) 35%, #fff);
          border: 1px solid var(--border);
        }
      `}</style>
    </p>
  );
}
