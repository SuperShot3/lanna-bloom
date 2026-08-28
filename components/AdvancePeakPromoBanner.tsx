'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import {
  getActiveAdvancePeakPromo,
  type AdvancePeakPromoI18nKey,
} from '@/lib/promo/advancePeakPromoCatalog';

const TICK_MS = 60_000;

const FALLBACK_COPY: Record<
  AdvancePeakPromoI18nKey,
  { bannerMessage: string; bannerMessageShort: string; bannerAlt: string }
> = {
  mothersDay2026Promo: {
    bannerMessage:
      'Order early for Mother’s Day (11–12 Aug) — 10% off flowers ฿1,500+ with code MOM10',
    bannerMessageShort: 'Mother’s Day 11–12 Aug · order early · 10% off · MOM10',
    bannerAlt: 'Order early for Thai Mother’s Day — 10% off with MOM10',
  },
  valentines2027Promo: {
    bannerMessage:
      'Order early for Valentine’s (12–14 Feb) — 10% off flowers ฿1,500+ with code LOVE10',
    bannerMessageShort: 'Valentine’s 12–14 Feb · order early · 10% off · LOVE10',
    bannerAlt: 'Order early for Valentine’s Day — 10% off with LOVE10',
  },
  womensDay2027Promo: {
    bannerMessage:
      'Order early for Women’s Day (7–8 Mar) — 10% off flowers ฿1,500+ with code WOMEN10',
    bannerMessageShort: 'Women’s Day 7–8 Mar · order early · 10% off · WOMEN10',
    bannerAlt: 'Order early for International Women’s Day — 10% off with WOMEN10',
  },
  newYear2026Promo: {
    bannerMessage:
      'Order early for New Year (30–31 Dec) — 10% off flowers ฿1,500+ with code NY10',
    bannerMessageShort: 'New Year 30–31 Dec · order early · 10% off · NY10',
    bannerAlt: 'Order early for New Year — 10% off with NY10',
  },
};

export function AdvancePeakPromoBanner({
  lang,
  onActiveChange,
}: {
  lang: Locale;
  onActiveChange?: (active: boolean) => void;
}) {
  const [activeKey, setActiveKey] = useState<AdvancePeakPromoI18nKey | null>(
    () => getActiveAdvancePeakPromo(new Date())?.i18nKey ?? null
  );

  const sync = useCallback(() => {
    const next = getActiveAdvancePeakPromo(new Date());
    const nextKey = next?.i18nKey ?? null;
    setActiveKey((prev) => {
      const wasActive = prev != null;
      const isActive = nextKey != null;
      if (wasActive !== isActive) onActiveChange?.(isActive);
      return nextKey;
    });
  }, [onActiveChange]);

  useLayoutEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const id = window.setInterval(sync, TICK_MS);
    return () => window.clearInterval(id);
  }, [sync]);

  if (!activeKey) return null;

  type PromoBannerCopy = {
    bannerMessage?: string;
    bannerMessageShort?: string;
    bannerAlt?: string;
  };
  const promo = (
    translations[lang] as unknown as Record<AdvancePeakPromoI18nKey, PromoBannerCopy | undefined>
  )[activeKey];
  const fallback = FALLBACK_COPY[activeKey];
  const messageDesktop = promo?.bannerMessage ?? fallback.bannerMessage;
  const messageMobile = promo?.bannerMessageShort ?? fallback.bannerMessageShort;
  const ariaLabel = promo?.bannerAlt ?? fallback.bannerAlt;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex min-h-[calc(2.25rem+env(safe-area-inset-top,0px))] items-center justify-center border-b border-[#3d2a10]/80 bg-[#5c4a1f] px-3 pb-1 pt-[calc(env(safe-area-inset-top,0px)+0.25rem)] text-white sm:px-4"
      role="status"
      aria-label={ariaLabel}
    >
      <p className="flex items-center justify-center gap-2 text-balance text-center text-[10px] font-medium leading-snug tracking-wide sm:text-xs md:font-semibold">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-90" aria-hidden>
          <path
            d="M12 3l1.9 5.8H20l-4.8 3.5 1.8 5.7L12 14.5 7 17.9l1.8-5.7L4 8.8h6.1L12 3z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <span className="md:hidden">{messageMobile}</span>
        <span className="hidden md:inline">{messageDesktop}</span>
      </p>
    </div>
  );
}

/** @deprecated Use AdvancePeakPromoBanner — kept as alias for any lingering imports. */
export { AdvancePeakPromoBanner as MothersDayMom10PromoBanner };
