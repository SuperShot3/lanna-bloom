'use client';

import { useEffect, useState, type ComponentType } from 'react';
import Image from 'next/image';
import { scheduleIdle } from '@/lib/scheduleIdle';
import type { HeroCarouselImage } from '@/components/ui/hero-carousel-types';
import {
  catalogImageUnoptimized,
  HERO_CAROUSEL_IMAGE_SIZES,
  HERO_LCP_IMAGE_QUALITY,
} from '@/lib/catalog/catalogImage';

function HeroFirstSlide({ image }: { image: HeroCarouselImage }) {
  return (
    <div className="relative w-full">
      <div
        className="hero-carousel-stage relative z-10 w-full touch-pan-y px-0 py-1 sm:px-1 sm:py-3 md:py-4 lg:py-4 min-h-[16.245rem] sm:min-h-[17.328rem] lg:aspect-[400/361] lg:min-h-0 lg:h-auto flex items-center justify-center overflow-x-hidden overflow-y-visible"
        aria-roledescription="carousel"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="hero-slide-frame absolute w-[17rem] h-[16.245rem] sm:w-72 sm:h-[17.328rem] md:w-[21rem] md:h-[303px] lg:w-96 lg:h-full flex items-center justify-center">
            <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-[0_24px_48px_-12px_rgba(26,60,52,0.32),0_10px_20px_-10px_rgba(26,60,52,0.22)]">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover pointer-events-none"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                quality={HERO_LCP_IMAGE_QUALITY}
                sizes={HERO_CAROUSEL_IMAGE_SIZES}
                unoptimized={catalogImageUnoptimized(image.src)}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#1A3C34]/25 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/35"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** First slide is HTML; interactive carousel hydrates after idle. */
export function IdleHeroCarousel({ images }: { images: HeroCarouselImage[] }) {
  const [Carousel, setCarousel] = useState<ComponentType<{
    images: HeroCarouselImage[];
  }> | null>(null);

  useEffect(() => {
    if (images.length <= 1) return undefined;
    let cancelled = false;
    const cancelIdle = scheduleIdle(() => {
      void import('@/components/ui/feature-carousel').then((m) => {
        if (!cancelled) setCarousel(() => m.HeroFeatureCarousel);
      });
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [images.length]);

  if (images.length === 0) return null;
  if (Carousel && images.length > 1) return <Carousel images={images} />;
  return <HeroFirstSlide image={images[0]} />;
}
