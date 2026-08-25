'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  catalogImageUnoptimized,
  CATALOG_CARD_IMAGE_SIZES,
} from '@/lib/catalog/catalogImage';

function CatalogCardHoverProgressDots({
  count,
  activeIndex,
  progressActive,
  durationMs,
}: {
  count: number;
  activeIndex: number;
  progressActive: boolean;
  durationMs: number;
}) {
  return (
    <div
      className="pointer-events-none absolute bottom-2 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-1.5"
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === activeIndex;
        return (
          <span
            key={index}
            className={cn(
              'relative h-1.5 overflow-hidden rounded-full transition-[width] duration-300',
              isActive ? 'w-7 bg-white/40' : 'w-1.5 bg-white/55'
            )}
          >
            {isActive && progressActive ? (
              <span
                key={`${activeIndex}-fill`}
                className="catalog-card-hover-progress absolute inset-0 rounded-full bg-[#C5A059]"
                style={{ animationDuration: `${durationMs}ms` }}
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export function CatalogCardHoverGalleryMedia({
  src,
  alt,
  sizes = CATALOG_CARD_IMAGE_SIZES,
  showDesktopDots,
  cycling,
  displayIndex,
  count,
  progressMs,
}: {
  src: string;
  alt: string;
  sizes?: string;
  showDesktopDots: boolean;
  cycling: boolean;
  displayIndex: number;
  count: number;
  progressMs: number;
}) {
  const [layer, setLayer] = useState<{ current: string; previous: string | null }>({
    current: src,
    previous: null,
  });

  useEffect(() => {
    setLayer((prev) => {
      if (prev.current === src) return prev;
      return { current: src, previous: prev.current };
    });
  }, [src]);

  const entering = Boolean(layer.previous && layer.previous !== layer.current);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {entering ? (
        <Image
          src={layer.previous as string}
          alt=""
          fill
          sizes={sizes}
          className="catalog-card-hover-img"
          unoptimized={catalogImageUnoptimized(layer.previous as string)}
          draggable={false}
          style={{ pointerEvents: 'none' }}
        />
      ) : null}
      <Image
        src={layer.current}
        alt={alt}
        fill
        sizes={sizes}
        className={cn('catalog-card-hover-img', entering && 'is-entering')}
        unoptimized={catalogImageUnoptimized(layer.current)}
        draggable={false}
        style={{ pointerEvents: 'none' }}
      />
      {showDesktopDots && count > 1 ? (
        <CatalogCardHoverProgressDots
          count={count}
          activeIndex={displayIndex}
          progressActive={cycling}
          durationMs={progressMs}
        />
      ) : null}
    </div>
  );
}
