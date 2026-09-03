'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
} from 'react';
import { getImageProps } from 'next/image';
import Link from 'next/link';
import { trackCtaClick } from '@/lib/analytics';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import { translations, type Locale } from '@/lib/i18n';
import {
  HYDRANGEA_SEASON_BANNER_AUTOPLAY_MS,
  HYDRANGEA_SEASON_BANNER_ENABLED,
  HYDRANGEA_SEASON_BANNER_IMAGE_SIZES,
  HYDRANGEA_SEASON_BANNER_LANDSCAPE_MIN_PX,
  HYDRANGEA_SEASON_SLIDES,
  type HydrangeaSeasonSlide,
} from '@/lib/promo/hydrangeaSeasonBanner';
import { cn } from '@/lib/utils';

const SWIPE_THRESHOLD_PX = 48;
const CTA_EVENT = 'cta_home_hydrangea_promo';
const HEADING_ID = 'home-promo-hydrangea-title';
/** Delay before fetching the next slide so first paint is one image. */
const PREFETCH_NEXT_MS = 2500;
const SLIDE_FADE_MS = 500;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return prefersReducedMotion;
}

function PromoSlidePicture({
  slide,
  alt,
  eager,
}: {
  slide: HydrangeaSeasonSlide;
  alt: string;
  eager?: boolean;
}) {
  const common = {
    alt,
    fill: true,
    sizes: HYDRANGEA_SEASON_BANNER_IMAGE_SIZES,
    quality: 80,
  } as const;
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: slide.horizontalSrc });
  const {
    props: { srcSet: mobileSrcSet, style, ...img },
  } = getImageProps({
    ...common,
    src: slide.verticalSrc,
    loading: eager ? 'eager' : 'lazy',
  });

  return (
    <picture className="absolute inset-0 block h-full w-full">
      <source
        media={`(min-width: ${HYDRANGEA_SEASON_BANNER_LANDSCAPE_MIN_PX}px)`}
        srcSet={desktopSrcSet}
        sizes={HYDRANGEA_SEASON_BANNER_IMAGE_SIZES}
      />
      {/* `style` keeps next/image's inline `position:absolute` for fill layout. */}
      <img
        {...img}
        alt={alt}
        srcSet={mobileSrcSet}
        style={style}
        className="object-cover object-center"
      />
    </picture>
  );
}

export function HomePromoBanner({ lang }: { lang: Locale }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prefetchNext, setPrefetchNext] = useState(false);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const ignoreClickRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const displayedIndexRef = useRef(0);

  const tHome = translations[lang].home;
  const slides = HYDRANGEA_SEASON_SLIDES;
  const href = `/${lang}/catalog${buildCatalogSearchString({ types: ['hydrangea'] })}`;
  const canNavigate = slides.length > 1;

  useEffect(() => {
    if (!canNavigate) return;
    const ready = window.setTimeout(() => setPrefetchNext(true), PREFETCH_NEXT_MS);
    return () => window.clearTimeout(ready);
  }, [canNavigate]);

  const goTo = useCallback(
    (next: number | ((prev: number) => number)) => {
      setCurrentIndex((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        const total = slides.length;
        return ((resolved % total) + total) % total;
      });
    },
    [slides.length]
  );

  useEffect(() => {
    const from = displayedIndexRef.current;
    if (from === currentIndex) return;
    displayedIndexRef.current = currentIndex;
    if (prefersReducedMotion) {
      setOutgoingIndex(null);
      return;
    }
    setOutgoingIndex(from);
    const timer = window.setTimeout(() => {
      setOutgoingIndex((outgoing) => (outgoing === from ? null : outgoing));
    }, SLIDE_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [currentIndex, prefersReducedMotion]);

  const handleNext = useCallback(() => {
    if (!canNavigate) return;
    goTo((prev) => prev + 1);
  }, [canNavigate, goTo]);

  const handlePrev = useCallback(() => {
    if (!canNavigate) return;
    goTo((prev) => prev - 1);
  }, [canNavigate, goTo]);

  const autoplayActive = canNavigate && !prefersReducedMotion && !isPaused;

  useEffect(() => {
    if (!autoplayActive) return;
    const timer = window.setInterval(handleNext, HYDRANGEA_SEASON_BANNER_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [autoplayActive, handleNext, currentIndex]);

  const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || !canNavigate) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      ignoreClickRef.current = true;
      if (deltaX < 0) handleNext();
      else handlePrev();
    },
    [canNavigate, handleNext, handlePrev]
  );

  const onTouchCancel = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  const handleSlideClick = useCallback(
    (slideId: HydrangeaSeasonSlide['id']) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (ignoreClickRef.current) {
        event.preventDefault();
        ignoreClickRef.current = false;
        return;
      }
      trackCtaClick(CTA_EVENT, { slide: slideId });
    },
    []
  );

  if (!HYDRANGEA_SEASON_BANNER_ENABLED || slides.length === 0) return null;

  const nextIndex = canNavigate ? (currentIndex + 1) % slides.length : currentIndex;
  const visibleIndexes = Array.from(
    new Set(
      [
        currentIndex,
        prefetchNext && nextIndex !== currentIndex ? nextIndex : null,
        outgoingIndex,
      ].filter((index): index is number => index != null)
    )
  );

  return (
    <section
      className="pt-6 pb-8 sm:pt-8 sm:pb-10 lg:pt-10 lg:pb-12"
      aria-roledescription="carousel"
      aria-labelledby={HEADING_ID}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Same max-width steps as the card below so the heading tracks its left edge. */}
        <div className="mx-auto mb-5 max-w-lg sm:mb-6 lg:max-w-none">
          <h2
            id={HEADING_ID}
            className="font-[family-name:var(--font-family-display)] text-3xl text-[#1A3C34] sm:text-4xl"
          >
            {tHome.promoHydrangeaHeading}
          </h2>
          <p className="mt-2 text-sm text-stone-600 sm:text-base">
            {tHome.promoHydrangeaSubheading}
          </p>
        </div>
        <div
          className="relative mx-auto max-w-lg lg:max-w-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={(event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) return;
            setIsPaused(false);
          }}
        >
          <div
            className="relative overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200/80 shadow-[0_12px_32px_-18px_rgba(26,60,52,0.28)]"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchCancel}
          >
            <div className="relative aspect-[4/5] w-full lg:aspect-[3/1]">
              {visibleIndexes.map((index) => {
                const slide = slides[index];
                if (!slide) return null;
                const isActive = index === currentIndex;
                const alt = tHome[slide.altKey];
                return (
                  <Link
                    key={slide.id}
                    href={href}
                    onClick={handleSlideClick(slide.id)}
                    tabIndex={isActive ? 0 : -1}
                    aria-hidden={!isActive}
                    className={cn(
                      'absolute inset-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C5A059]',
                      !prefersReducedMotion && 'transition-opacity duration-500 ease-out',
                      isActive ? 'z-[1] opacity-100' : 'pointer-events-none z-0 opacity-0'
                    )}
                  >
                    <PromoSlidePicture
                      slide={slide}
                      alt={alt}
                      eager={isActive && index === 0}
                    />
                  </Link>
                );
              })}
            </div>
          </div>

        {canNavigate ? (
          <div
            className="mt-3 flex items-center justify-center gap-1.5"
            role="tablist"
            aria-label={tHome.promoHydrangeaRegion}
          >
            {slides.map((slide, index) => {
              const isActive = index === currentIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={tHome.promoHydrangeaGoToSlide.replace('{n}', String(index + 1))}
                  onClick={() => goTo(index)}
                  className={cn(
                    'relative h-1.5 overflow-hidden rounded-full transition-all duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2',
                    isActive
                      ? 'w-7 bg-[#1A3C34]/15'
                      : 'w-1.5 bg-[#1A3C34]/15 hover:bg-[#C5A059]/50'
                  )}
                >
                  {isActive ? (
                    autoplayActive ? (
                      <span
                        key={currentIndex}
                        className="hero-carousel-progress absolute inset-0 origin-left rounded-full bg-[#C5A059]"
                        style={{ animationDuration: `${HYDRANGEA_SEASON_BANNER_AUTOPLAY_MS}ms` }}
                        aria-hidden
                      />
                    ) : (
                      <span
                        className="absolute inset-0 rounded-full bg-[#C5A059]"
                        aria-hidden
                      />
                    )
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
        </div>
      </div>
    </section>
  );
}
