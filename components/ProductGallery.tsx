'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3C/svg%3E';

const SWIPE_THRESHOLD_PX = 50;

export function ProductGallery({
  images,
  name,
  activeIndex,
  onActiveChange,
}: {
  images: string[];
  name: string;
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
}) {
  const [internalActive, setInternalActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const mouseStartX = useRef<number | null>(null);
  const mouseUpListenerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const lastPointerRef = useRef<'mouse' | 'touch' | null>(null);
  const isControlled = activeIndex !== undefined && onActiveChange !== undefined;
  const active = isControlled ? activeIndex : internalActive;
  const setActive = isControlled ? onActiveChange : setInternalActive;
  const list = images?.length ? images : [FALLBACK_IMAGE];
  const current = list[active] ?? list[0] ?? FALLBACK_IMAGE;

  const goPrev = useCallback(() => {
    setActive(active <= 0 ? list.length - 1 : active - 1);
  }, [active, list.length, setActive]);

  const goNext = useCallback(() => {
    setActive(active >= list.length - 1 ? 0 : active + 1);
  }, [active, list.length, setActive]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    lastPointerRef.current = 'touch';
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current == null || list.length <= 1) {
        touchStartX.current = null;
        return;
      }
      const endX = e.changedTouches[0].clientX;
      const delta = endX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
        didSwipeRef.current = true;
        if (delta < 0) goNext();
        else goPrev();
        setTimeout(() => {
          didSwipeRef.current = false;
        }, 300);
      }
    },
    [goNext, goPrev, list.length]
  );

  const handleMainClick = useCallback((e: React.MouseEvent) => {
    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }
    if (e?.detail === 1 && lastPointerRef.current === 'mouse') return;
    setLightboxOpen(true);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      lastPointerRef.current = 'mouse';
      mouseStartX.current = e.clientX;
      const onMouseUp = (upEv: MouseEvent) => {
        window.removeEventListener('mouseup', onMouseUp);
        mouseUpListenerRef.current = null;
        if (mouseStartX.current == null) return;
        const delta = upEv.clientX - mouseStartX.current;
        mouseStartX.current = null;
        if (list.length <= 1) return;
        if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
          if (delta < 0) goNext();
          else goPrev();
        }
      };
      mouseUpListenerRef.current = onMouseUp;
      window.addEventListener('mouseup', onMouseUp);
    },
    [goNext, goPrev, list.length]
  );

  useEffect(() => {
    return () => {
      if (mouseUpListenerRef.current) {
        window.removeEventListener('mouseup', mouseUpListenerRef.current);
        mouseUpListenerRef.current = null;
      }
    };
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const handleLightboxBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeLightbox();
  }, [closeLightbox]);

  return (
    <div className="gallery">
      <div
        className="gallery-main"
        style={{ touchAction: 'pan-y' }}
        onClick={handleMainClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="button"
        tabIndex={0}
        aria-label="View image full size"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setLightboxOpen(true);
          }
        }}
      >
        <Image
          src={current}
          alt={name}
          width={600}
          height={600}
          className="gallery-image"
          priority
          sizes="(max-width: 600px) 100vw, 50vw"
          unoptimized={current.startsWith('data:')}
          draggable={false}
          style={{ pointerEvents: 'none' }}
        />
        {list.length > 1 && (
          <span className="gallery-swipe-hint" aria-hidden>
            Swipe to change · Tap to zoom
          </span>
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
                setActive(i);
              }}
              aria-label={`View image ${i + 1}`}
            >
              <Image src={src} alt="" width={80} height={80} className="thumb-img" unoptimized={src.startsWith('data:')} />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image zoom"
          onClick={handleLightboxBackdropClick}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeLightbox();
            if (list.length > 1 && e.key === 'ArrowLeft') goPrev();
            if (list.length > 1 && e.key === 'ArrowRight') goNext();
          }}
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
                <span aria-hidden>‹</span>
              </button>
            )}
            <div className="gallery-lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="gallery-lightbox-close"
                onClick={closeLightbox}
                aria-label="Close"
              >
                <span aria-hidden>×</span>
              </button>
              <div className="gallery-lightbox-img-inner" key={active}>
                <Image
                  src={current}
                  alt={name}
                  fill
                  className="gallery-lightbox-img"
                  unoptimized={current.startsWith('data:')}
                  sizes="100vw"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
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
                <span aria-hidden>›</span>
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .gallery {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .gallery-main {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--radius);
          overflow: hidden;
          background: var(--pastel-cream);
          margin-bottom: 12px;
          cursor: zoom-in;
          touch-action: pan-y;
          user-select: none;
          -webkit-user-select: none;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .gallery-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .gallery-swipe-hint {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          pointer-events: none;
        }
        .gallery-thumbs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .thumb {
          flex-shrink: 0;
          width: 64px;
          height: 64px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 2px solid transparent;
          padding: 0;
          background: var(--surface);
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .thumb.active {
          border-color: var(--accent);
        }
        .thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .gallery-lightbox {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
        }
        .gallery-lightbox-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          max-width: min(95vw, 640px);
        }
        .gallery-lightbox-img-wrap {
          position: relative;
          flex: 1;
          max-width: min(90vw, 560px);
          max-height: min(85vh, 560px);
          aspect-ratio: 1;
        }
        .gallery-lightbox-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          border: none;
          background: var(--surface);
          color: var(--text);
          font-size: 24px;
          font-weight: 600;
          line-height: 1;
          border-radius: 50%;
          cursor: pointer;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease, transform 0.2s ease;
          box-shadow: var(--shadow);
          border: 2px solid var(--border);
        }
        .gallery-lightbox-close:hover {
          background: var(--accent-soft);
          border-color: var(--accent);
          transform: scale(1.05);
        }
        .gallery-lightbox-close:active {
          transform: scale(0.98);
        }
        .gallery-lightbox-prev,
        .gallery-lightbox-next {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          min-width: 48px;
          min-height: 48px;
          border: none;
          background: var(--surface);
          color: var(--accent);
          font-size: 28px;
          line-height: 1;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease, transform 0.2s ease;
          box-shadow: var(--shadow);
          border: 2px solid var(--border);
        }
        .gallery-lightbox-prev:hover,
        .gallery-lightbox-next:hover {
          background: var(--accent-soft);
          border-color: var(--accent);
          transform: scale(1.08);
        }
        .gallery-lightbox-prev:active,
        .gallery-lightbox-next:active {
          transform: scale(0.96);
        }
        .gallery-lightbox-img-inner {
          position: absolute;
          inset: 0;
          border-radius: var(--radius);
          overflow: hidden;
        }
        .gallery-lightbox-img-inner {
          animation: gallery-lightbox-fade 0.35s ease-out;
        }
        @keyframes gallery-lightbox-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .gallery-lightbox-img {
          object-fit: contain;
        }
        @media (max-width: 600px) {
          .gallery-lightbox {
            padding: 16px 12px;
          }
          .gallery-lightbox-inner {
            gap: 8px;
          }
          .gallery-lightbox-close {
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            min-width: 40px;
            min-height: 40px;
            font-size: 20px;
          }
          .gallery-lightbox-prev,
          .gallery-lightbox-next {
            width: 44px;
            height: 44px;
            min-width: 44px;
            min-height: 44px;
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
