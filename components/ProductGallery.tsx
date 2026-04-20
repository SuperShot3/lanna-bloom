'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import './ProductGallery.css';

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3C/svg%3E';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(touchA: Touch, touchB: Touch): number {
  const dx = touchA.clientX - touchB.clientX;
  const dy = touchA.clientY - touchB.clientY;
  return Math.hypot(dx, dy);
}

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
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxOffset, setLightboxOffset] = useState({ x: 0, y: 0 });
  const [dismissOffsetY, setDismissOffsetY] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false,
  });
  const tapRef = useRef<{ x: number; y: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; baseX: number; baseY: number } | null>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

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

  useEffect(() => {
    const media = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setIsTouchDevice(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

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

  const resetLightboxTransform = useCallback(() => {
    setLightboxScale(1);
    setLightboxOffset({ x: 0, y: 0 });
    setDismissOffsetY(0);
    tapRef.current = null;
    panRef.current = null;
    pinchRef.current = null;
  }, []);

  const setGalleryIndex = useCallback(
    (index: number) => {
      setActive(index);
      emblaApi?.scrollTo(index);
    },
    [emblaApi, setActive]
  );

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    setGalleryIndex(lightboxIndex);
    resetLightboxTransform();
  }, [lightboxIndex, resetLightboxTransform, setGalleryIndex]);

  const stepLightbox = useCallback(
    (direction: 1 | -1) => {
      setLightboxIndex((prev) => {
        const next = (prev + direction + list.length) % list.length;
        setGalleryIndex(next);
        return next;
      });
      resetLightboxTransform();
    },
    [list.length, resetLightboxTransform, setGalleryIndex]
  );

  const openLightbox = useCallback(() => {
    if (!isTouchDevice) return;
    if (emblaApi && !emblaApi.clickAllowed()) return;
    setLightboxIndex(active);
    setIsLightboxOpen(true);
    resetLightboxTransform();
  }, [active, emblaApi, isTouchDevice, resetLightboxTransform]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeLightbox, isLightboxOpen]);

  const handleLightboxTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length === 2) {
        pinchRef.current = {
          distance: touchDistance(event.touches[0], event.touches[1]),
          scale: lightboxScale,
        };
        tapRef.current = null;
        return;
      }
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      tapRef.current = { x: touch.clientX, y: touch.clientY };
      panRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        baseX: lightboxOffset.x,
        baseY: lightboxOffset.y,
      };
    },
    [lightboxOffset.x, lightboxOffset.y, lightboxScale]
  );

  const handleLightboxTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length === 2 && pinchRef.current) {
        event.preventDefault();
        const distance = touchDistance(event.touches[0], event.touches[1]);
        const nextScale = clamp((distance / pinchRef.current.distance) * pinchRef.current.scale, 1, 4);
        setLightboxScale(nextScale);
        if (nextScale <= 1.02) {
          setLightboxOffset({ x: 0, y: 0 });
        }
        return;
      }

      if (event.touches.length !== 1 || !panRef.current || !tapRef.current) return;
      const touch = event.touches[0];
      const dx = touch.clientX - panRef.current.x;
      const dy = touch.clientY - panRef.current.y;

      if (lightboxScale > 1.01) {
        event.preventDefault();
        const maxPan = (lightboxScale - 1) * 180;
        setLightboxOffset({
          x: clamp(panRef.current.baseX + dx, -maxPan, maxPan),
          y: clamp(panRef.current.baseY + dy, -maxPan, maxPan),
        });
        return;
      }

      if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
        event.preventDefault();
        setDismissOffsetY(clamp(dy, 0, 260));
      }
    },
    [lightboxScale]
  );

  const handleLightboxTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length < 2) {
        pinchRef.current = null;
      }
      const touch = event.changedTouches[0];
      if (!touch || !tapRef.current) {
        setDismissOffsetY(0);
        return;
      }

      const dx = touch.clientX - tapRef.current.x;
      const dy = touch.clientY - tapRef.current.y;

      if (dismissOffsetY > 120 && lightboxScale <= 1.01) {
        closeLightbox();
      } else if (lightboxScale <= 1.01 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        stepLightbox(dx < 0 ? 1 : -1);
      } else {
        setDismissOffsetY(0);
        if (lightboxScale <= 1.01) {
          setLightboxScale(1);
          setLightboxOffset({ x: 0, y: 0 });
        }
      }

      tapRef.current = null;
      panRef.current = null;
    },
    [closeLightbox, dismissOffsetY, lightboxScale, stepLightbox]
  );

  const lightboxBackgroundOpacity = clamp(0.92 - dismissOffsetY / 400, 0.35, 0.92);

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
        <div className="gallery-viewport" ref={sliderReady ? emblaRef : undefined} onClick={openLightbox}>
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
                <span className="gallery-chevron gallery-chevron-prev" aria-hidden>
                  ‹
                </span>
              </button>
              <button
                type="button"
                className="gallery-next"
                onClick={goNext}
                aria-label="Next image"
              >
                <span className="gallery-chevron gallery-chevron-next" aria-hidden>
                  ›
                </span>
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

      {isLightboxOpen && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${name} image zoom`}
          style={{ backgroundColor: `rgba(0, 0, 0, ${lightboxBackgroundOpacity})` }}
          onClick={closeLightbox}
        >
          <button type="button" className="gallery-lightbox-close" aria-label="Close zoom" onClick={closeLightbox}>
            X
          </button>
          <div
            className="gallery-lightbox-stage"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
            style={{
              transform: `translateY(${dismissOffsetY}px)`,
            }}
          >
            <Image
              src={list[lightboxIndex]}
              alt={`${name} - zoomed image ${lightboxIndex + 1}`}
              width={1200}
              height={1200}
              className="gallery-lightbox-image"
              unoptimized={list[lightboxIndex].startsWith('data:')}
              draggable={false}
              style={{
                transform: `translate(${lightboxOffset.x}px, ${lightboxOffset.y}px) scale(${lightboxScale})`,
              }}
            />
          </div>
          {list.length > 1 ? (
            <p className="gallery-lightbox-counter" aria-live="polite">
              {lightboxIndex + 1} / {list.length}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
