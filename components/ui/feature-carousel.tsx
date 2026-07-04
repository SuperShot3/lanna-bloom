'use client';

import React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { catalogImageUnoptimized } from '@/lib/catalog/catalogImage';

export type HeroCarouselImage = { src: string; alt: string };

const AUTOPLAY_MS = 3000;
const SWIPE_THRESHOLD_PX = 48;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return prefersReducedMotion;
}

function useIsMdUp() {
  const [isMdUp, setIsMdUp] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsMdUp(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMdUp;
}

export function HeroFeatureCarousel({
  images,
  className,
}: {
  images: HeroCarouselImage[];
  className?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMdUp = useIsMdUp();
  const canNavigate = images.length > 1;
  const [currentIndex, setCurrentIndex] = React.useState(() =>
    images.length > 0 ? Math.floor(images.length / 2) : 0
  );
  const [isPaused, setIsPaused] = React.useState(false);

  const handleNext = React.useCallback(() => {
    if (!canNavigate) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [canNavigate, images.length]);

  const handlePrev = React.useCallback(() => {
    if (!canNavigate) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [canNavigate, images.length]);

  const handleGoTo = React.useCallback(
    (index: number) => {
      if (!canNavigate) return;
      setCurrentIndex(index);
    },
    [canNavigate]
  );

  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = React.useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = React.useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || !canNavigate) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      if (
        Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
        Math.abs(deltaX) < Math.abs(deltaY)
      ) {
        return;
      }

      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    },
    [canNavigate, handleNext, handlePrev]
  );

  const onTouchCancel = React.useCallback(() => {
    touchStartRef.current = null;
  }, []);

  const autoplayActive = canNavigate && !prefersReducedMotion && !isPaused;

  // `currentIndex` in deps restarts the timer after manual navigation,
  // so the user always gets the full interval before the next auto-advance.
  React.useEffect(() => {
    if (!autoplayActive) return;
    const timer = window.setInterval(handleNext, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [autoplayActive, handleNext, currentIndex]);

  React.useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(Math.floor(images.length / 2));
    }
  }, [currentIndex, images.length]);

  if (images.length === 0) return null;

  const spreadPercent = isMdUp ? 46 : 27;

  return (
    <div className={cn('relative w-full', className)}>
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-25"
        aria-hidden
      >
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(197,160,89,0.4),rgba(255,255,255,0))] md:h-[400px] md:w-[400px]" />
        <div className="absolute bottom-0 right-[-20%] top-[-10%] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(26,60,52,0.28),rgba(255,255,255,0))] md:h-[400px] md:w-[400px]" />
      </div>

      <div
        className="relative z-10 w-full touch-pan-y px-0 py-2 sm:px-1 sm:py-6 md:py-7 lg:py-8 min-h-[400px] sm:min-h-[390px] lg:aspect-[4/5] lg:min-h-0 lg:h-auto flex items-center justify-center overflow-x-hidden overflow-y-visible"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-roledescription="carousel"
      >
        <div className="relative w-full h-full flex items-center justify-center [perspective:1200px]">
          {images.map((image, index) => {
            const offset = index - currentIndex;
            const total = images.length;
            let pos = (offset + total) % total;
            if (pos > Math.floor(total / 2)) {
              pos = pos - total;
            }

            const isCenter = pos === 0;
            const isAdjacent = Math.abs(pos) === 1;

            return (
              <div
                key={`${image.src}-${index}`}
                className={cn(
                  'absolute w-[17rem] h-[22.5rem] sm:w-72 sm:h-96 md:w-[21rem] md:h-[420px] lg:w-96 lg:h-full',
                  'transition-all duration-[650ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
                  'flex items-center justify-center'
                )}
                style={{
                  transform: `
                        translateX(${pos * spreadPercent}%)
                        translateY(${isCenter ? 0 : 2.5}%)
                        scale(${isCenter ? 1 : isAdjacent ? 0.86 : 0.72})
                        rotateY(${pos * -12}deg)
                      `,
                  zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                  opacity: isCenter ? 1 : isAdjacent ? 0.55 : 0,
                  filter: isCenter
                    ? 'blur(0px) saturate(1)'
                    : 'blur(2px) saturate(0.85)',
                  visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                }}
              >
                <div
                  className={cn(
                    'relative h-full w-full overflow-hidden rounded-3xl transition-shadow duration-[650ms]',
                    isCenter
                      ? 'shadow-[0_24px_48px_-12px_rgba(26,60,52,0.32),0_10px_20px_-10px_rgba(26,60,52,0.22)]'
                      : 'shadow-[0_12px_28px_-12px_rgba(26,60,52,0.2)]'
                  )}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className={cn(
                      'object-cover pointer-events-none',
                      isCenter && !prefersReducedMotion && 'hero-carousel-kenburns'
                    )}
                    priority={isCenter || isAdjacent}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    unoptimized={catalogImageUnoptimized(image.src)}
                  />
                  {/* Soft green vignette at the base of the featured photo */}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#1A3C34]/25 to-transparent transition-opacity duration-[650ms]"
                    style={{ opacity: isCenter ? 1 : 0 }}
                    aria-hidden
                  />
                  {/* Glass edge highlight */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/35"
                    aria-hidden
                  />
                </div>
              </div>
            );
          })}
        </div>

        {canNavigate ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-1 sm:left-4 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full border-[#1A3C34]/10 bg-white/85 text-[#1A3C34] shadow-[0_8px_20px_-8px_rgba(26,60,52,0.35)] backdrop-blur-sm transition-all duration-200 hover:bg-white hover:text-[#C5A059] hover:shadow-[0_12px_24px_-8px_rgba(26,60,52,0.4)] hover:scale-105 active:scale-95"
              onClick={handlePrev}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-1 sm:right-4 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full border-[#1A3C34]/10 bg-white/85 text-[#1A3C34] shadow-[0_8px_20px_-8px_rgba(26,60,52,0.35)] backdrop-blur-sm transition-all duration-200 hover:bg-white hover:text-[#C5A059] hover:shadow-[0_12px_24px_-8px_rgba(26,60,52,0.4)] hover:scale-105 active:scale-95"
              onClick={handleNext}
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            <div
              className="absolute bottom-1 sm:bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5"
              role="tablist"
              aria-label="Carousel photos"
            >
              {images.map((image, index) => {
                const isActive = index === currentIndex;
                return (
                  <button
                    key={`dot-${image.src}-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Go to photo ${index + 1}`}
                    onClick={() => handleGoTo(index)}
                    className={cn(
                      'relative h-1.5 overflow-hidden rounded-full transition-all duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
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
                          style={{ animationDuration: `${AUTOPLAY_MS}ms` }}
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
          </>
        ) : null}
      </div>
    </div>
  );
}
