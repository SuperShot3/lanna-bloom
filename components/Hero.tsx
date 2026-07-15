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
import { HowToOrderModal } from '@/components/HowToOrderModal';
import { StorefrontIcon } from '@/components/icons';

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
          <StorefrontIcon name="schedule" size={18} className="leading-none" />
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
  onHowItWorks,
  introItemClass,
  ctaExtraClass = '',
  reviewsExtraClass = '',
}: {
  lang: Locale;
  primaryCtaHref: string;
  onHowItWorks: () => void;
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
          className="hero-cta hero-cta--premium group relative isolate overflow-hidden px-6 py-3 sm:px-8 sm:py-4 font-semibold rounded-full shadow-[0_12px_28px_-14px_rgba(26,60,52,0.7)] hover:shadow-[0_20px_40px_-18px_rgba(26,60,52,0.72)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 text-sm sm:text-base"
        >
          <span
            aria-hidden
            className="hero-cta__sheen pointer-events-none absolute inset-0 -translate-x-[120%] bg-[linear-gradient(110deg,transparent_24%,rgba(255,255,255,0.55)_50%,transparent_76%)] transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
          />
          <span className="relative z-[1]">{t.ctaBrowse}</span>
          <StorefrontIcon
            name="arrow-forward"
            size={20}
            className="relative z-[1] transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </Link>
        <button
          type="button"
          onClick={onHowItWorks}
          className="px-6 py-3 sm:px-8 sm:py-4 bg-white border border-stone-200 font-semibold rounded-full hover:bg-stone-50 transition-all text-sm sm:text-base flex items-center justify-center"
        >
          {t.ctaHowItWorks}
        </button>
      </div>
      <GoogleReviewsBadge
        lang={lang}
        className={`${introItemClass} ${reviewsExtraClass}`.trim()}
      />
      <style jsx>{`
        @media (hover: none) and (pointer: coarse) {
          .hero-cta--premium .hero-cta__sheen {
            animation: hero-cta-mobile-sheen 3s ease-in-out infinite;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-cta--premium .hero-cta__sheen {
            animation: none;
          }
        }

        @keyframes hero-cta-mobile-sheen {
          0%,
          64% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(120%);
          }
        }
      `}</style>
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
  const [howToOpen, setHowToOpen] = useState(false);
  const imageSrc = heroImageUrl || DEFAULT_HERO_IMAGE;
  const heroCarouselImages = buildHeroCarouselImages(imageSrc, carouselImages);
  const isHomeLanding =
    !titleOverride &&
    (pathname === '/' ||
      (pathParts.length === 1 && locales.includes(pathParts[0] as Locale)));
  const introClass = isHomeLanding ? 'home-hero-intro' : '';
  const introItemClass = isHomeLanding ? 'home-hero-intro__item' : '';

  const handleHowItWorks = () => {
    if (isHomeLanding) {
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setHowToOpen(true);
  };

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
            <StorefrontIcon name="verified" size={18} />
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
              onHowItWorks={handleHowItWorks}
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
            onHowItWorks={handleHowItWorks}
            introItemClass={introItemClass}
            ctaExtraClass="home-hero-intro__delay-5"
            reviewsExtraClass="home-hero-intro__delay-6"
          />
        </div>
      </div>
      {!isHomeLanding ? (
        <HowToOrderModal lang={lang} isOpen={howToOpen} onClose={() => setHowToOpen(false)} />
      ) : null}
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
