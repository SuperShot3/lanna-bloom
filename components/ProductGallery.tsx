'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import './ProductGallery.css';

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3C/svg%3E';
const SWIPE_THRESHOLD_PX = 30;

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const [internalActive, setInternalActive] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const isControlled = activeIndex !== undefined && onActiveChange !== undefined;
  const active = isControlled ? activeIndex : internalActive;
  const setActive = isControlled ? onActiveChange! : setInternalActive;

  const list = images?.length ? images : [FALLBACK_IMAGE];
  const current = list[active] ?? list[0] ?? FALLBACK_IMAGE;
  const viewTransitionName = productId ? `product-${productId}` : undefined;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false,
  });

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
    const onSelect = () => {
      const idx = emblaApi.selectedScrollSnap();
      setActive(idx);
    };
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, setActive]);

  useEffect(() => {
    if (emblaApi && isControlled && activeIndex !== undefined) {
      if (emblaApi.selectedScrollSnap() !== activeIndex) {
        emblaApi.scrollTo(activeIndex);
      }
    }
  }, [emblaApi, isControlled, activeIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current == null) return;
      const endX = e.changedTouches[0].clientX;
      const delta = Math.abs(endX - touchStartX.current);
      touchStartX.current = null;
      if (delta >= SWIPE_THRESHOLD_PX) {
        didSwipeRef.current = true;
        setTimeout(() => {
          didSwipeRef.current = false;
        }, 400);
      }
    },
    []
  );

  const handleMainClick = useCallback(() => {
    if (didSwipeRef.current) return;
    setLightboxOpen(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (list.length > 1 && e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
      if (list.length > 1 && e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setLightboxOpen(true);
      }
    },
    [goPrev, goNext, list.length]
  );

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (lightboxOpen && lightboxRef.current) {
      lightboxRef.current.focus();
    }
  }, [lightboxOpen]);

  return (
    <div className="gallery">
      <div
        className="gallery-main"
        onClick={handleMainClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="View image full size"
      >
        <div className="gallery-viewport" ref={emblaRef}>
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
            Swipe to change · Tap to zoom
          </span>
        )}
      </div>

      {list.length > 1 && (
        <>
          <div className="gallery-nav">
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
          <div className="gallery-dots" role="tablist" aria-label="Image gallery">
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
        </>
      )}

      {lightboxOpen && (
        <div
          ref={lightboxRef}
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image zoom"
          tabIndex={-1}
          onClick={(e) => e.target === e.currentTarget && closeLightbox()}
          onKeyDown={handleKeyDown}
        >
          <div className="gallery-lightbox-inner">
            {list.length > 1 && (
              <button
                type="button"
                className="gallery-lightbox-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Previous image"
              >
                ‹
              </button>
            )}
            <div className="gallery-lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="gallery-lightbox-close"
                onClick={closeLightbox}
                aria-label="Close"
              >
                ×
              </button>
              <div className="gallery-lightbox-img-inner">
                <Image
                  src={current}
                  alt={name}
                  fill
                  className="gallery-lightbox-img"
                  unoptimized={current.startsWith('data:')}
                  sizes="100vw"
                />
              </div>
            </div>
            {list.length > 1 && (
              <button
                type="button"
                className="gallery-lightbox-next"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Next image"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
