'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Locale, locales, translations } from '@/lib/i18n';
import { trackCtaClick } from '@/lib/analytics';
import {
  HeroFeatureCarousel,
  type HeroCarouselImage,
} from '@/components/ui/feature-carousel';
import { getMarketByPathSlug, isMarketPathSlug } from '@/lib/delivery/markets';
import { readMarketSession } from '@/lib/delivery/marketSession';
import { GoogleReviewsBadge } from '@/components/GoogleReviewsBadge';

const DEFAULT_HERO_IMAGE = 'public/HeroImage/heroimage.webp';

const FALLBACK_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1563241527-3004b7becc23?auto=format&fit=crop&q=80&w=800&h=1000',
  'https://images.unsplash.com/photo-1561181286-d3fee7d55ef6?auto=format&fit=crop&q=80&w=800&h=1000',
  'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=800&h=1000',
  'https://images.unsplash.com/photo-1562690868-60bbe7293e94?auto=format&fit=crop&q=80&w=800&h=1000',
  'https://images.unsplash.com/photo-1490750967868-88cb4ec0f07c?auto=format&fit=crop&q=80&w=800&h=1000',
];

const HERO_IMAGE_ALT = 'Beautiful boutique floral arrangement';

function HeroExpressDeliveryCard({
  lang,
  className,
}: {
  lang: Locale;
  className?: string;
}) {
  const t = translations[lang].hero;
  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border border-stone-100 max-w-sm ${className ?? ''}`.trim()}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
          <span className="material-symbols-outlined text-lg leading-none inline-flex items-center justify-center">
            schedule
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs">{t.expressDelivery}</p>
          <p className="text-[10px] text-stone-500 truncate">{t.expressArea}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] font-medium gap-2">
        <span className="text-[#C5A059]">{t.availableNow}</span>
        <span className="truncate">{t.avgDelivery}</span>
      </div>
    </div>
  );
}

function buildHeroCarouselImages(
  heroImageUrl?: string,
  carouselImages?: string[]
): HeroCarouselImage[] {
  const sourceImages =
    carouselImages && carouselImages.length > 0
      ? carouselImages
      : heroImageUrl
        ? [heroImageUrl]
        : FALLBACK_HERO_IMAGES;

  return sourceImages.map((src) => ({ src, alt: HERO_IMAGE_ALT }));
}

function HeroVisualBlock({
  images,
  lang,
  className,
}: {
  images: HeroCarouselImage[];
  lang: Locale;
  className?: string;
}) {
  return (
    <div className={`relative min-w-0 w-full ${className ?? ''}`.trim()}>
      <HeroFeatureCarousel images={images} />
      <HeroExpressDeliveryCard
        lang={lang}
        className="absolute bottom-3 left-2 sm:bottom-5 sm:left-4 p-3 sm:p-4 max-w-[10.5rem] sm:max-w-[11.5rem] shadow-xl z-30 pointer-events-none animate-[bounce_3s_ease-in-out_infinite] lg:bottom-12 lg:-left-10 lg:p-6 lg:max-w-xs lg:shadow-2xl"
      />
    </div>
  );
}

function HeroCtaSection({
  lang,
  primaryCtaHref,
  howToHref,
  introItemClass,
  ctaExtraClass = '',
  reviewsExtraClass = '',
}: {
  lang: Locale;
  primaryCtaHref: string;
  howToHref: string;
  introItemClass: string;
  ctaExtraClass?: string;
  reviewsExtraClass?: string;
}) {
  const t = translations[lang].hero;
  return (
    <>
      <div
        className={`${introItemClass} ${ctaExtraClass} flex flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-8 lg:mb-8`.trim()}
      >
        <Link
          href={primaryCtaHref}
          onClick={() => trackCtaClick('cta_home_top')}
          className="hero-cta px-6 py-3 sm:px-8 sm:py-4 font-semibold rounded-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 text-sm sm:text-base"
        >
          {t.ctaBrowse}
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <Link
          href={howToHref}
          className="px-6 py-3 sm:px-8 sm:py-4 bg-white border border-stone-200 font-semibold rounded-full hover:bg-stone-50 transition-all text-sm sm:text-base flex items-center justify-center"
        >
          {t.ctaHowItWorks}
        </Link>
      </div>
      <GoogleReviewsBadge
        lang={lang}
        className={`${introItemClass} ${reviewsExtraClass}`.trim()}
      />
    </>
  );
}

export function Hero({
  lang,
  heroImageUrl,
  carouselImages,
  titleOverride,
  browseCollectionHref,
}: {
  lang: Locale;
  heroImageUrl?: string;
  carouselImages?: string[];
  /** Optional page-specific H1 override (keeps same hero design). */
  titleOverride?: React.ReactNode;
  /** Optional primary CTA target for pages that show a collection section inline. */
  browseCollectionHref?: string;
}) {
  const t = translations[lang].hero;
  const pathname = usePathname();
  const pathParts = pathname?.split('/').filter(Boolean) ?? [];
  const maybeMarketSlug = pathParts[1];
  const activeMarket =
    maybeMarketSlug && isMarketPathSlug(maybeMarketSlug)
      ? getMarketByPathSlug(maybeMarketSlug)
      : null;
  const [sessionMarketSlug, setSessionMarketSlug] = useState<string | null>(null);
  const sessionMarket =
    sessionMarketSlug && isMarketPathSlug(sessionMarketSlug)
      ? getMarketByPathSlug(sessionMarketSlug)
      : null;
  const effectiveMarket = activeMarket ?? sessionMarket;
  const catalogHref = effectiveMarket
    ? `/${lang}/catalog/${effectiveMarket.pathSlug}`
    : `/${lang}/catalog`;
  const primaryCtaHref = browseCollectionHref ?? catalogHref;
  const howToHref = `/${lang}/info/how-to-order-flower-delivery-chiang-mai`;
  const imageSrc = heroImageUrl || DEFAULT_HERO_IMAGE;
  const heroCarouselImages = buildHeroCarouselImages(imageSrc, carouselImages);
  const isHomeLanding =
    !titleOverride &&
    (pathname === '/' ||
      (pathParts.length === 1 && locales.includes(pathParts[0] as Locale)));
  const introClass = isHomeLanding ? 'home-hero-intro' : '';
  const introItemClass = isHomeLanding ? 'home-hero-intro__item' : '';

  useEffect(() => {
    const load = () => {
      const s = readMarketSession();
      setSessionMarketSlug(s?.pathSlug ?? null);
    };
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);

  const sectionPad = isHomeLanding
    ? 'pt-4 pb-2 sm:pt-6 sm:pb-3 md:pt-8 md:pb-4 lg:pt-10 lg:pb-5'
    : 'pt-4 pb-6 sm:pt-6 sm:pb-8 md:pt-8 md:pb-10 lg:pt-12 lg:pb-12';

  return (
    <section className={`relative overflow-x-hidden ${sectionPad}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4 sm:gap-6 md:gap-8 lg:grid lg:grid-cols-2 lg:gap-10 xl:gap-14 lg:items-center min-w-0">
        <div className={`order-1 lg:order-none relative z-10 min-w-0 ${introClass}`}>
          <div
            className={`${introItemClass} inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C5A059]/10 text-[#C5A059] font-medium text-sm mb-2 sm:mb-3 md:mb-4`.trim()}
          >
            <span className="material-symbols-outlined text-lg">verified</span>
            {t.badge}
          </div>
          <h1
            className={`${introItemClass} font-[family-name:var(--font-family-display)] text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-7xl leading-[1.1] text-[#1A3C34] mb-3 sm:mb-4 md:mb-6 break-words`.trim()}
          >
            {titleOverride ?? (
              <>
                {t.headlineNew} <br />
                <span className="italic text-[#C5A059]">{t.headlineAccent}</span>
              </>
            )}
          </h1>
          <p
            className={`${introItemClass} text-base sm:text-lg text-stone-600 mb-0 max-w-lg leading-relaxed`.trim()}
          >
            {t.sublineNew}
          </p>
          <div className="hidden lg:block mt-[6px]">
            <HeroCtaSection
              lang={lang}
              primaryCtaHref={primaryCtaHref}
              howToHref={howToHref}
              introItemClass={introItemClass}
            />
          </div>
        </div>

        <HeroVisualBlock
          images={heroCarouselImages}
          lang={lang}
          className={`order-2 lg:order-none lg:col-start-2 pt-1 pb-1 sm:pt-2 sm:pb-2 lg:pt-3 lg:pb-4 ${introItemClass} home-hero-intro__delay-4`.trim()}
        />

        <div className={`order-3 lg:hidden relative z-10 min-w-0 ${introClass}`}>
          <HeroCtaSection
            lang={lang}
            primaryCtaHref={primaryCtaHref}
            howToHref={howToHref}
            introItemClass={introItemClass}
            ctaExtraClass="home-hero-intro__delay-5"
            reviewsExtraClass="home-hero-intro__delay-6"
          />
        </div>
      </div>
      {isHomeLanding ? (
        <div
          id="hero-sentinel"
          className="pointer-events-none absolute bottom-0 left-0 h-px w-full"
          aria-hidden
        />
      ) : null}
    </section>
  );
}
