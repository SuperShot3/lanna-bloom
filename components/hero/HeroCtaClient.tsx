'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { getMarketByPathSlug, isMarketPathSlug } from '@/lib/delivery/markets';
import { readPersistedMarketSession, MARKET_SESSION_CHANGE_EVENT } from '@/lib/delivery/marketSession';
import { PremiumCtaLink } from '@/components/home/PremiumCtaLink';

const HowToOrderModal = dynamic(
  () => import('@/components/HowToOrderModal').then((m) => m.HowToOrderModal),
  { ssr: false }
);

export function HeroCtaClient({
  lang,
  defaultHref,
  allowSessionCatalogHref,
  browseLabel,
  howItWorksLabel,
  introItemClass,
  reviews,
}: {
  lang: Locale;
  defaultHref: string;
  allowSessionCatalogHref: boolean;
  browseLabel: string;
  howItWorksLabel: string;
  introItemClass: string;
  reviews: React.ReactNode;
}) {
  const pathname = usePathname();
  const [howToOpen, setHowToOpen] = useState(false);
  const [sessionHref, setSessionHref] = useState<string | null>(null);

  useEffect(() => {
    if (!allowSessionCatalogHref) return undefined;
    const load = () => {
      const s = readPersistedMarketSession();
      const slug = s?.pathSlug ?? null;
      if (slug && isMarketPathSlug(slug)) {
        const market = getMarketByPathSlug(slug);
        setSessionHref(market ? `/${lang}/catalog/${market.pathSlug}` : null);
        return;
      }
      setSessionHref(null);
    };
    load();
    window.addEventListener('focus', load);
    window.addEventListener(MARKET_SESSION_CHANGE_EVENT, load);
    return () => {
      window.removeEventListener('focus', load);
      window.removeEventListener(MARKET_SESSION_CHANGE_EVENT, load);
    };
  }, [allowSessionCatalogHref, lang]);

  const pathParts = pathname?.split('/').filter(Boolean) ?? [];
  const maybeMarketSlug = pathParts[1];
  const activeMarket =
    maybeMarketSlug && isMarketPathSlug(maybeMarketSlug)
      ? getMarketByPathSlug(maybeMarketSlug)
      : null;
  const pathHref = activeMarket
    ? `/${lang}/catalog/${activeMarket.pathSlug}`
    : null;
  const primaryCtaHref = allowSessionCatalogHref
    ? pathHref ?? sessionHref ?? defaultHref
    : defaultHref;

  return (
    <>
      <div
        className={`${introItemClass} flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-5`.trim()}
      >
        <PremiumCtaLink
          href={primaryCtaHref}
          ctaEvent="cta_home_top"
        >
          {browseLabel}
        </PremiumCtaLink>
        <button
          type="button"
          onClick={() => setHowToOpen(true)}
          className="px-6 py-3 sm:px-8 sm:py-4 bg-white border border-stone-200 font-semibold rounded-full hover:bg-stone-50 transition-all text-sm sm:text-base flex items-center justify-center"
        >
          {howItWorksLabel}
        </button>
      </div>
      <div className={introItemClass}>{reviews}</div>
      {howToOpen ? (
        <HowToOrderModal lang={lang} isOpen={howToOpen} onClose={() => setHowToOpen(false)} />
      ) : null}
    </>
  );
}
