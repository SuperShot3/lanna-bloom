'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { formatPeakCelebrationTemplate } from '@/lib/promo/peakCelebrationMessages';
import {
  getActivePeakCelebrationNotice,
  getActivePeakCelebrationSpike,
  type PeakCelebrationRule,
} from '@/lib/promo/peakCelebrationPricing';

const TICK_MS = 60_000;

type BannerMode = 'advance' | 'active';

function resolveBanner(now = new Date()): { mode: BannerMode; rule: PeakCelebrationRule } | null {
  const spike = getActivePeakCelebrationSpike(now);
  if (spike) return { mode: 'active', rule: spike };
  const advance = getActivePeakCelebrationNotice(now);
  if (advance) return { mode: 'advance', rule: advance };
  return null;
}

export function PeakCelebrationNoticeBanner({
  lang,
  onActiveChange,
}: {
  lang: Locale;
  onActiveChange?: (active: boolean) => void;
}) {
  const [banner, setBanner] = useState<ReturnType<typeof resolveBanner>>(
    () => resolveBanner(new Date())
  );
  const [active, setActive] = useState(() => resolveBanner(new Date()) != null);

  const sync = useCallback(() => {
    const nextBanner = resolveBanner(new Date());
    const next = nextBanner != null;
    setBanner(nextBanner);
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

  if (!active || !banner) return null;

  const copy = translations[lang].peakCelebration ?? translations.en.peakCelebration;
  const { mode, rule } = banner;
  const messageDesktop = formatPeakCelebrationTemplate(
    lang,
    mode === 'active' ? copy.noticeBannerActive : copy.noticeBanner,
    rule
  );
  const messageMobile = formatPeakCelebrationTemplate(
    lang,
    mode === 'active' ? copy.noticeBannerActiveShort : copy.noticeBannerShort,
    rule
  );
  const ariaLabel = formatPeakCelebrationTemplate(
    lang,
    mode === 'active' ? copy.noticeBannerActiveAlt : copy.noticeBannerAlt,
    rule
  );
  const policyHref = `/${lang}/info/delivery-policy#peak-celebration-pricing`;

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
        <Link href={policyHref} className="hidden underline-offset-2 hover:underline md:inline">
          {messageDesktop}
        </Link>
      </p>
    </div>
  );
}
