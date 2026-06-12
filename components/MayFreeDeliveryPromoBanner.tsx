'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { isMay2026FreeDeliveryActive } from '@/lib/promo/campaigns';

const TICK_MS = 60_000;

export function MayFreeDeliveryPromoBanner({
  lang,
  onActiveChange,
}: {
  lang: Locale;
  onActiveChange?: (active: boolean) => void;
}) {
  const [active, setActive] = useState(false);

  const sync = useCallback(() => {
    const next = isMay2026FreeDeliveryActive(new Date());
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

  const promo = translations[lang].mayFreeDeliveryPromo;
  const messageDesktop =
    promo?.bannerMessage ??
    'Free delivery 19–31 May on flower orders ฿2,500+ — applied automatically at checkout';
  const messageMobile =
    promo?.bannerMessageShort ?? 'Free delivery 19–31 May · ฿2,500+ on flowers';
  const ariaLabel = promo?.bannerAlt ?? messageDesktop;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex min-h-[calc(2.25rem+env(safe-area-inset-top,0px))] items-center justify-center border-b border-[#0f2e28]/80 bg-[#1A3C34] px-3 pb-1 pt-[calc(env(safe-area-inset-top,0px)+0.25rem)] text-white sm:px-4"
      role="status"
      aria-label={ariaLabel}
    >
      <p className="flex items-center justify-center gap-2 text-balance text-center text-[10px] font-medium leading-snug tracking-wide sm:text-xs md:font-semibold">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-90" aria-hidden>
          <path
            d="M3 6h11v9H3V6zm11 2h4l3 4v3h-7V8zm-9 11a2 2 0 100-4 2 2 0 000 4zm12 0a2 2 0 100-4 2 2 0 000 4z"
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
