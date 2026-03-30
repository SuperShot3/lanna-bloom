'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { isPrimeHourBangkok } from '@/lib/promo/primeHours';

const PROMO_CODE = process.env.NEXT_PUBLIC_HAPPY_HOUR_PROMO_CODE ?? 'B4Y';

const TICK_MS = 60_000;

export function PrimeHourPromoBanner({
  lang,
  onActiveChange,
}: {
  lang: Locale;
  onActiveChange?: (active: boolean) => void;
}) {
  const [active, setActive] = useState(false);

  const sync = useCallback(() => {
    const next = isPrimeHourBangkok(new Date());
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

  const template = translations[lang].primeHourBanner.message;
  const [beforeCode, afterCode = ''] = template.split('{code}');

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex h-[calc(2.25rem+env(safe-area-inset-top,0px))] items-center justify-center border-b border-[#0f2e28]/80 bg-[#1A3C34] pt-[env(safe-area-inset-top,0px)] text-white"
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
      role="status"
    >
      <p className="text-balance text-center text-[11px] font-medium uppercase leading-tight tracking-wide sm:text-xs">
        {beforeCode}
        <span className="underline decoration-white underline-offset-2">{PROMO_CODE}</span>
        {afterCode}
      </p>
    </div>
  );
}
