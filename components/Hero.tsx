import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { HeroCarouselImage } from '@/components/ui/hero-carousel-types';
import { buildHeroTrustLine } from '@/lib/landingPages/heroTrustLine';
import { GoogleReviewsBadge } from '@/components/GoogleReviewsBadge';
import { StorefrontIcon } from '@/components/icons';
import { IdleHeroCarousel } from '@/components/hero/IdleHeroCarousel';
import { HeroCtaClient } from '@/components/hero/HeroCtaClient';

const DEFAULT_HERO_IMAGE = 'public/HeroImage/heroimage.webp';

const FALLBACK_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1563241527-3004b7becc23?auto=format&fit=crop&q=80&w=800&h=1000',
  'https://images.unsplash.com/photo-1561181286-d3fee7d55ef6?auto=format&fit=crop&q=80&w=800&h=1000',
  'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=800&h=1000',
  'https://images.unsplash.com/photo-1562690868-60bbe7293e94?auto=format&fit=crop&q=80&w=800&h=1000',
  'https://images.unsplash.com/photo-1490750967868-88cb4ec0f07c?auto=format&fit=crop&q=80&w=800&h=1000',
];

function heroImageAlt(city: string): string {
  return `Fresh flower bouquet prepared for ${city} delivery`;
}

type HeroDeliveryTiming = 'same_day' | 'next_day' | 'preorder_only' | 'other';

function defaultCityName(lang: Locale): string {
  if (lang === 'th') return 'เชียงใหม่';
  if (lang === 'ru') return 'Чиангмае';
  if (lang === 'zh-sg') return '清迈';
  if (lang === 'zh-hk') return '清邁';
  return 'Chiang Mai';
}

function HeroExpressDeliveryCard({
  lang,
  className,
  timing = 'same_day',
}: {
  lang: Locale;
  className?: string;
  timing?: HeroDeliveryTiming;
}) {
  const t = translations[lang].hero;
  const title =
    timing === 'next_day'
      ? t.nextDayDelivery
      : timing === 'preorder_only'
        ? t.preorderDelivery
        : t.expressDelivery;
  const status =
    timing === 'next_day'
      ? t.nextDayAvailable
      : timing === 'preorder_only'
        ? t.preorderAvailable
        : t.avgDelivery;
  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border border-stone-100 max-w-sm ${className ?? ''}`.trim()}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
          <StorefrontIcon name="schedule" size={18} className="leading-none" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs">{title}</p>
          <p className="text-[10px] text-stone-500 truncate">{t.expressArea}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] font-medium gap-2">
        <span className="text-[#C5A059]">{t.availableNow}</span>
        <span className="truncate">{status}</span>
      </div>
    </div>
  );
}

function buildHeroCarouselImages(
  heroImageUrl: string | undefined,
  carouselImages: HeroCarouselImage[] | undefined,
  city: string
): HeroCarouselImage[] {
  const fallbackAlt = heroImageAlt(city);
  if (carouselImages && carouselImages.length > 0) {
    return carouselImages.map((img) => ({
      src: img.src,
      alt: img.alt.trim() || fallbackAlt,
    }));
  }
  if (heroImageUrl) {
    return [{ src: heroImageUrl, alt: fallbackAlt }];
  }
  return FALLBACK_HERO_IMAGES.map((src) => ({ src, alt: fallbackAlt }));
}

export function Hero({
  lang,
  heroImageUrl,
  carouselImages,
  titleOverride,
  browseCollectionHref,
  locationName,
  timing = 'same_day',
  sublineOverride,
}: {
  lang: Locale;
  heroImageUrl?: string;
  carouselImages?: HeroCarouselImage[];
  titleOverride?: React.ReactNode;
  browseCollectionHref?: string;
  locationName?: string;
  timing?: HeroDeliveryTiming;
  sublineOverride?: string;
}) {
  const t = translations[lang].hero;
  const city = locationName ?? defaultCityName(lang);
  const trustLine = buildHeroTrustLine({ lang, city, timing });
  const sublineNew = (sublineOverride ?? t.sublineNew).replace('{city}', city);
  const headlineNew = t.headlineNew.replace('{city}', city);
  const defaultHref = browseCollectionHref ?? `/${lang}/catalog`;
  const imageSrc = heroImageUrl || DEFAULT_HERO_IMAGE;
  const heroCarouselImages = buildHeroCarouselImages(imageSrc, carouselImages, city);
  const isHomeLanding = !titleOverride;
  const introClass = isHomeLanding ? 'home-hero-intro' : '';
  const introItemClass = isHomeLanding ? 'home-hero-intro__item' : '';
  const sectionPad = isHomeLanding
    ? 'pt-1 pb-2 sm:pt-2 sm:pb-3 md:pt-2 md:pb-4 lg:pt-2 lg:pb-5'
    : 'pt-1 pb-6 sm:pt-2 sm:pb-8 md:pt-2 md:pb-10 lg:pt-2 lg:pb-12';

  return (
    <section className={`relative overflow-x-hidden ${sectionPad}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4 sm:gap-6 md:gap-8 lg:grid lg:grid-cols-2 lg:gap-10 xl:gap-14 lg:items-start min-w-0">
        <div className={`order-1 lg:order-none relative z-10 min-w-0 ${introClass}`}>
          <div
            className={`${introItemClass} inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C5A059]/10 text-[#C5A059] font-medium text-sm mb-2 sm:mb-3 md:mb-4`.trim()}
          >
            <StorefrontIcon name="verified" size={18} />
            {trustLine}
          </div>
          <h1
            className={`${introItemClass} text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-7xl leading-[1.1] text-[#1A3C34] mb-3 sm:mb-4 md:mb-6 break-words`.trim()}
          >
            {titleOverride ?? (
              <>
                {headlineNew} <br />
                <span className="italic text-[#C5A059]">{t.headlineAccent}</span>
              </>
            )}
          </h1>
          <p
            className={`${introItemClass} text-base sm:text-lg text-stone-600 mb-0 max-w-lg leading-relaxed`.trim()}
          >
            {sublineNew}
          </p>
          <div className="mt-4 sm:mt-5">
            <HeroCtaClient
              lang={lang}
              defaultHref={defaultHref}
              allowSessionCatalogHref={!browseCollectionHref}
              browseLabel={t.ctaBrowse}
              howItWorksLabel={t.ctaHowItWorks}
              introItemClass={introItemClass}
              reviews={<GoogleReviewsBadge lang={lang} />}
            />
          </div>
        </div>

        <div className="relative min-w-0 w-full order-2 lg:order-none lg:col-start-2">
          <IdleHeroCarousel images={heroCarouselImages} />
          <HeroExpressDeliveryCard
            lang={lang}
            timing={timing}
            className="absolute bottom-3 left-2 sm:bottom-5 sm:left-4 p-3 sm:p-4 max-w-[10.5rem] sm:max-w-[11.5rem] shadow-xl z-30 pointer-events-none animate-[bounce_3s_ease-in-out_infinite] lg:bottom-12 lg:-left-10 lg:p-6 lg:max-w-xs lg:shadow-2xl"
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
