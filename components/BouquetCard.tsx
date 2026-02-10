'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bouquet } from '@/lib/bouquets';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { trackSelectItem } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';

const SWIPE_THRESHOLD_PX = 50;

export function BouquetCard({ bouquet, lang }: { bouquet: Bouquet; lang: Locale }) {
  const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
  const minPrice = bouquet.sizes?.length
    ? Math.min(...bouquet.sizes.map((s) => s.price))
    : 0;
  const href = `/${lang}/catalog/${bouquet.slug}`;
  const t = translations[lang].catalog;
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
        setTimeout(() => {
          didSwipeRef.current = false;
        }, 300);
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
          }, 300);
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

  return (
    <article className="card">
      <Link href={href} className="card-link" onClick={handleLinkClick}>
        <div
          className="card-image-wrap"
          style={canSwipe ? { touchAction: 'pan-y' } : undefined}
          onTouchStart={canSwipe ? handleTouchStart : undefined}
          onTouchEnd={canSwipe ? handleTouchEnd : undefined}
          onMouseDown={canSwipe ? handleMouseDown : undefined}
          aria-label={canSwipe ? 'Swipe to see more images' : undefined}
        >
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={name}
              width={400}
              height={400}
              className="card-image"
              sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
              unoptimized={isDataUrl}
              draggable={false}
              style={{ pointerEvents: 'none' }}
            />
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
          <h2 className="card-title">{name}</h2>
          <p className="card-price">
            {t.from} ฿{minPrice.toLocaleString()}
          </p>
          <p className="card-delivery">{t.deliveryNote}</p>
          <span className="card-cta">{t.viewDetails}</span>
        </div>
      </Link>
      <style jsx>{`
        .card {
          background: var(--surface);
          border-radius: var(--radius);
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-hover);
        }
        .card-link {
          display: block;
          color: inherit;
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
          object-fit: cover;
        }
        .card-image-placeholder {
          background: var(--pastel-cream);
          min-height: 100%;
        }
        .card-body {
          padding: 16px;
        }
        .card-title {
          font-family: var(--font-serif);
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0 0 6px;
          color: var(--text);
        }
        .card-price {
          font-size: 0.95rem;
          color: var(--text-muted);
          margin: 0 0 6px;
        }
        .card-delivery {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0 0 10px;
          line-height: 1.35;
        }
        .card-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 6px 14px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--accent);
          background: transparent;
          border: 2px solid var(--accent);
          border-radius: 9999px;
          transition: background 0.2s, color 0.2s, transform 0.2s;
          white-space: nowrap;
        }
        .card-link:hover .card-cta {
          background: var(--accent-soft);
          color: var(--text);
        }
      `}</style>
    </article>
  );
}
