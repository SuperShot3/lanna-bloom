'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { isMothersDay2026PromoActive } from '@/lib/promo/mothersDay2026Promo';

const TICK_MS = 60_000;

export function MothersDayMom10PromoBanner({
  lang,
  onActiveChange,
}: {
  lang: Locale;
  onActiveChange?: (active: boolean) => void;
}) {
  const [active, setActive] = useState(false);

  const sync = useCallback(() => {
    const next = isMothersDay2026PromoActive(new Date());
    setActive((prev) => {
      if (prev !== next) onActiveChange?.(next);
      return next;
    });
  }, [onActiveChange]);

  useLayoutEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const id = window.setInterval(sync, TICK_MS);
    return () => window.clearInterval(id);
  }, [sync]);

  if (!active) return null;

  const promo = translations[lang].mothersDay2026Promo;
  const messageDesktop =
    promo?.bannerMessage ??
    'Mother’s Day early order: 10% off flowers ฿1,500+ with code MOM10 — delivery before 10 Aug';
  const messageMobile =
    promo?.bannerMessageShort ?? '10% off flowers ฿1,500+ · code MOM10 · before 10 Aug';
  const ariaLabel = promo?.bannerAlt ?? messageDesktop;

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
