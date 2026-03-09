'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import './ProductGallery.css';

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3C/svg%3E';

export function ProductGallery({
  images,
  name,
  productId,
  activeIndex,
  onActiveChange,
}: {
  images: string[];
  name: string;
  /** Sanity document id - used for shared element view-transition-name */
  productId?: string;
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
}) {
  const [internalActive, setInternalActive] = useState(0);
  const isControlled = activeIndex !== undefined && onActiveChange !== undefined;
  const active = isControlled ? activeIndex : internalActive;
  const setActive = isControlled ? onActiveChange! : setInternalActive;

  const imagesKey = images?.join?.(',') ?? '';
  const list = useMemo(
    () => (images?.length ? images : [FALLBACK_IMAGE]),
    [imagesKey]
  );
  const viewTransitionName = productId ? `product-${productId}` : undefined;

  const [sliderReady, setSliderReady] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false,
  });

  useEffect(() => {
    let cancelled = false;
    const firstSrc = list[0];
    const run = async () => {
      if (!firstSrc) {
        setSliderReady(true);
        return;
      }
      if (firstSrc.startsWith('data:')) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) setSliderReady(true);
          });
        });
        return;
      }
      try {
        const img = document.createElement('img');
        img.src = firstSrc;
        if (typeof img.decode === 'function') {
          await img.decode();
        } else {
          await new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          });
        }
        if (cancelled) return;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) setSliderReady(true);
          });
        });
      } catch {
        if (!cancelled) setSliderReady(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [list[0]]);

  const goPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const goNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi]
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSettle = () => {
      const idx = emblaApi.selectedScrollSnap();
      setActive(idx);
    };
    emblaApi.on('settle', onSettle);
    onSettle();
    return () => {
      emblaApi.off('settle', onSettle);
    };
  }, [emblaApi, setActive]);

  useEffect(() => {
    if (emblaApi && isControlled && activeIndex !== undefined) {
      if (emblaApi.selectedScrollSnap() !== activeIndex) {
        emblaApi.scrollTo(activeIndex);
      }
    }
  }, [emblaApi, isControlled, activeIndex]);

  return (
    <div className="gallery">
      <div className="gallery-main">
        <div className="gallery-viewport" ref={sliderReady ? emblaRef : undefined}>
          <div className="gallery-container">
            {list.map((src, i) => (
              <div key={i} className="gallery-slide">
                <div
                  className="gallery-slide-inner"
                  style={
                    i === 0 && viewTransitionName
                      ? ({ viewTransitionName } as React.CSSProperties)
                      : undefined
                  }
                >
                  <Image
                    src={src}
                    alt={i === 0 ? name : `${name} - image ${i + 1}`}
                    width={600}
                    height={600}
                    className="gallery-image"
                    sizes="(max-width: 600px) 100vw, 50vw"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    unoptimized={src.startsWith('data:')}
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {list.length > 1 && (
          <span className="gallery-swipe-hint" aria-hidden>
            Swipe to change
          </span>
        )}
        {list.length > 1 && (
          <>
            <div className="gallery-nav" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="gallery-prev"
                onClick={goPrev}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                className="gallery-next"
                onClick={goNext}
                aria-label="Next image"
              >
                ›
              </button>
            </div>
            <div
              className="gallery-dots"
              role="tablist"
              aria-label="Image gallery"
              onClick={(e) => e.stopPropagation()}
            >
              {list.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`View image ${i + 1}`}
                  className={`gallery-dot ${i === active ? 'active' : ''}`}
                  onClick={() => scrollTo(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="gallery-thumbs">
            {list.map((src, i) => (
              <button
                key={i}
                type="button"
                className={`thumb ${i === active ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  scrollTo(i);
                }}
                aria-label={`View image ${i + 1}`}
              >
                <Image
                  src={src}
                  alt=""
                  width={80}
                  height={80}
                  className="thumb-img"
                  loading="lazy"
                  unoptimized={src.startsWith('data:')}
                />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
