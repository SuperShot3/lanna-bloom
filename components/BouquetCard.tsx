'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { PrefetchLink } from '@/components/PrefetchLink';
import { Bouquet } from '@/lib/bouquets';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { trackSelectItem } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';

const SWIPE_THRESHOLD_PX = 50;

export function BouquetCard({ bouquet, lang }: { bouquet: Bouquet; lang: Locale }) {
  const t = translations[lang].catalog;
  const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
  const minPrice = bouquet.sizes?.length
    ? Math.min(...bouquet.sizes.map((s) => s.price))
    : 0;
  const href = `/${lang}/catalog/${bouquet.slug}`;
  const images = bouquet.images?.length ? bouquet.images : [];
  const [imageIndex, setImageIndex] = useState(0);
  const imgSrc = images[imageIndex] ?? images[0] ?? '';
  const isDataUrl = typeof imgSrc === 'string' && imgSrc.startsWith('data:');
  const canSwipe = images.length > 1;

  const touchStartX = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const mouseStartX = useRef<number | null>(null);
  const mouseUpListenerRef = useRef<((e: MouseEvent) => void) | null>(null);

  const goPrev = useCallback(() => {
    setImageIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setImageIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current == null || !canSwipe) {
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
        // iOS Safari can fire click 300–400ms after touchend; use 450ms to avoid accidental navigation
        setTimeout(() => {
          didSwipeRef.current = false;
        }, 450);
      }
    },
    [canSwipe, goNext, goPrev]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!canSwipe) return;
      mouseStartX.current = e.clientX;
      const onMouseUp = (upEv: MouseEvent) => {
        window.removeEventListener('mouseup', onMouseUp);
        mouseUpListenerRef.current = null;
        if (mouseStartX.current == null) return;
        const delta = upEv.clientX - mouseStartX.current;
        mouseStartX.current = null;
        if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
          didSwipeRef.current = true;
          if (delta < 0) goNext();
          else goPrev();
          setTimeout(() => {
            didSwipeRef.current = false;
          }, 450);
        }
      };
      mouseUpListenerRef.current = onMouseUp;
      window.addEventListener('mouseup', onMouseUp);
    },
    [canSwipe, goNext, goPrev]
  );

  useEffect(() => {
    return () => {
      if (mouseUpListenerRef.current) {
        window.removeEventListener('mouseup', mouseUpListenerRef.current);
        mouseUpListenerRef.current = null;
      }
    };
  }, []);

  const handleLinkClick = useCallback(
    (e: React.MouseEvent) => {
      if (didSwipeRef.current) {
        e.preventDefault();
        return;
      }
      const item: AnalyticsItem = {
        item_id: bouquet.id,
        item_name: name,
        item_category: bouquet.category,
        item_variant: bouquet.sizes?.[0]?.label,
        price: minPrice,
        quantity: 1,
        index: 0,
      };
      trackSelectItem('catalog', item);
    },
    [bouquet.id, bouquet.category, bouquet.sizes, name, minPrice]
  );

  const viewTransitionName = `product-${bouquet.id}`;

  return (
    <article className="card">
      <PrefetchLink
        href={href}
        className="card-link"
        data-ga-select-item="catalog"
        onClick={handleLinkClick}
        aria-label={`${name} — from ฿${minPrice.toLocaleString()}`}
      >
        <div
          className="card-image-wrap"
          style={
            canSwipe
              ? { touchAction: 'pan-y' as const }
              : undefined
          }
          onTouchStart={canSwipe ? handleTouchStart : undefined}
          onTouchEnd={canSwipe ? handleTouchEnd : undefined}
          onMouseDown={canSwipe ? handleMouseDown : undefined}
          aria-label={canSwipe ? 'Swipe to see more images' : undefined}
        >
          {imgSrc ? (
            <div
              className="card-image-shared"
              style={{ viewTransitionName } as React.CSSProperties}
            >
              <Image
                src={imgSrc}
                alt={name}
                width={400}
                height={400}
                className="card-image"
                sizes="(max-width: 600px) 50vw, (max-width: 900px) 50vw, 33vw"
                unoptimized={isDataUrl}
                draggable={false}
                style={{ pointerEvents: 'none' }}
              />
            </div>
          ) : (
            <div className="card-image card-image-placeholder" aria-hidden />
          )}
          {canSwipe && (
            <div className="card-dots" aria-hidden>
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`card-dot ${i === imageIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="card-body">
          <div className="card-name" title={name}>
            {name}
          </div>
          <div className="card-price">
            {t.from} ฿{minPrice.toLocaleString()}
          </div>
        </div>
      </PrefetchLink>
      <style jsx>{`
        .card {
          background: var(--surface);
          border-radius: var(--radius);
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          transition: transform 0.2s, box-shadow 0.2s;
          width: 100%;
          max-width: 100%;
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-hover);
        }
        .card-link {
          display: block;
          color: inherit;
          text-decoration: none;
          touch-action: manipulation; /* Removes 300ms tap delay on iOS, reduces click-after-swipe glitch */
        }
        .card-link:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-radius: var(--radius);
        }
        .card-image-wrap {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          background: var(--pastel-cream);
          max-width: 100%;
          border-radius: var(--radius);
        }
        .card-image-shared {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        .card-dots {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          pointer-events: none;
        }
        .card-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          transition: background 0.2s;
        }
        .card-dot.active {
          background: var(--accent);
        }
        .card-image,
        .card-image-placeholder {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          object-fit: cover;
        }
        .card-image-placeholder {
          background: var(--pastel-cream);
          min-height: 100%;
        }
        .card-body {
          padding: 11px 12px 13px;
        }
        .card-name {
          font-family: var(--font-serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 6px;
        }
        .card-price {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }
      `}</style>
    </article>
  );
}
