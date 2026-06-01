'use client';

import React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type HeroCarouselImage = { src: string; alt: string };

const AUTOPLAY_MS = 4000;

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

  const handleNext = React.useCallback(() => {
    if (!canNavigate) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [canNavigate, images.length]);

  const handlePrev = React.useCallback(() => {
    if (!canNavigate) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [canNavigate, images.length]);

  React.useEffect(() => {
    if (!canNavigate || prefersReducedMotion) return;
    const timer = window.setInterval(handleNext, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [canNavigate, handleNext, prefersReducedMotion]);

  React.useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(Math.floor(images.length / 2));
    }
  }, [currentIndex, images.length]);

  if (images.length === 0) return null;

  const spreadPercent = isMdUp ? 45 : 32;

  return (
    <div className={cn('relative w-full', className)}>
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        aria-hidden
      >
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(197,160,89,0.35),rgba(255,255,255,0))] md:h-[400px] md:w-[400px]" />
        <div className="absolute bottom-0 right-[-20%] top-[-10%] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(26,60,52,0.25),rgba(255,255,255,0))] md:h-[400px] md:w-[400px]" />
      </div>

      <div className="relative z-10 w-full px-1 py-5 sm:py-6 md:py-7 lg:py-8 min-h-[340px] sm:min-h-[390px] lg:aspect-[4/5] lg:min-h-0 lg:h-auto flex items-center justify-center overflow-x-hidden overflow-y-visible">
        <div className="relative w-full h-full flex items-center justify-center [perspective:1000px]">
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
                  'absolute w-[13.5rem] h-72 sm:w-72 sm:h-96 md:w-[21rem] md:h-[420px] lg:w-96 lg:h-full transition-all duration-500 ease-in-out',
                  'flex items-center justify-center'
                )}
                style={{
                  transform: `
                        translateX(${pos * spreadPercent}%)
                        scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7})
                        rotateY(${pos * -10}deg)
                      `,
                  zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                  opacity: isCenter ? 1 : isAdjacent ? 0.4 : 0,
                  filter: isCenter ? 'blur(0px)' : 'blur(4px)',
                  visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-3xl border-2 border-[#1A3C34]/10 shadow-2xl">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover pointer-events-none"
                    priority={isCenter || isAdjacent}
                    sizes="(max-width: 1024px) 100vw, 50vw"
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
              className="absolute left-1 sm:left-4 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full border-stone-200 bg-white/90 backdrop-blur-sm hover:bg-white"
              onClick={handlePrev}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-1 sm:right-4 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full border-stone-200 bg-white/90 backdrop-blur-sm hover:bg-white"
              onClick={handleNext}
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
