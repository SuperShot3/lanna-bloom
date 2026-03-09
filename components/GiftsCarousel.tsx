'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import type { CatalogProduct } from '@/lib/sanity';
import type { Locale } from '@/lib/i18n';
import { computeFinalPrice } from '@/lib/partnerPricing';

export function GiftsCarousel({ gifts, lang }: { gifts: CatalogProduct[]; lang: Locale }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    loop: gifts.length > 2,
    skipSnaps: false,
    duration: 35,
  });
  const goPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const goNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!gifts.length) return null;

  return (
    <div className="gifts-carousel-wrap">
      {gifts.length > 1 && (
        <button
          type="button"
          className="gifts-carousel-arrow gifts-carousel-prev"
          onClick={goPrev}
          aria-label="Previous gifts"
        >
          ‹
        </button>
      )}
      <div className="gifts-carousel-viewport" ref={emblaRef}>
        <div className="gifts-carousel-container">
          {gifts.map((product) => {
            const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
            const href = `/${lang}/catalog/${product.slug}`;
            const imgSrc = product.images?.[0] ?? '';
            const isDataUrl = typeof imgSrc === 'string' && imgSrc.startsWith('data:');
            const finalPrice = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);

            return (
              <div key={product.id} className="gifts-carousel-slide">
                <Link
                  href={href}
                  className="gifts-product-card"
                  aria-label={`${name} — ฿${finalPrice.toLocaleString()}`}
                >
                  <div className="gifts-product-image-wrap">
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={name}
                        width={120}
                        height={120}
                        className="gifts-product-image"
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                        unoptimized={isDataUrl}
                        draggable={false}
                      />
                    ) : (
                      <div className="gifts-product-image-placeholder" aria-hidden />
                    )}
                  </div>
                  <p className="gifts-product-name">{name}</p>
                  <p className="gifts-product-price">฿{finalPrice.toLocaleString()}</p>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
      {gifts.length > 1 && (
        <button
          type="button"
          className="gifts-carousel-arrow gifts-carousel-next"
          onClick={goNext}
          aria-label="Next gifts"
        >
          ›
        </button>
      )}
      {gifts.length > 1 && (
        <p className="gifts-carousel-swipe-hint" aria-hidden>
          {lang === 'th' ? 'เลื่อนเพื่อดูเพิ่มเติม' : 'Swipe to browse'}
        </p>
      )}
      <style jsx>{`
        .gifts-carousel-wrap {
          position: relative;
          margin-bottom: 20px;
        }
        .gifts-carousel-viewport {
          overflow: hidden;
          touch-action: pan-y pinch-zoom;
          cursor: grab;
          -webkit-overflow-scrolling: touch;
        }
        .gifts-carousel-viewport:active {
          cursor: grabbing;
        }
        .gifts-carousel-container {
          display: flex;
          gap: 12px;
          margin-left: -12px;
        }
        .gifts-carousel-slide {
          flex: 0 0 45%;
          min-width: 0;
          padding-left: 12px;
        }
        @media (min-width: 480px) {
          .gifts-carousel-slide {
            flex: 0 0 33.333%;
          }
        }
        @media (min-width: 640px) {
          .gifts-carousel-slide {
            flex: 0 0 25%;
          }
        }
        .gifts-carousel-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          min-width: 36px;
          min-height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          transition: background 0.2s, border-color 0.2s;
          touch-action: manipulation;
        }
        .gifts-carousel-arrow:hover {
          background: var(--pastel-cream);
          border-color: #1a3c34;
        }
        .gifts-carousel-prev {
          left: -8px;
        }
        .gifts-carousel-next {
          right: -8px;
        }
        @media (max-width: 480px) {
          .gifts-carousel-arrow {
            width: 40px;
            height: 40px;
            min-width: 40px;
            min-height: 40px;
          }
        }
        .gifts-carousel-swipe-hint {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          margin-top: 6px;
        }
        .gifts-product-card {
          display: block;
          padding: 12px;
          border: 2px solid var(--border);
          border-radius: 12px;
          background: var(--surface);
          text-align: center;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.2s, background 0.2s;
        }
        .gifts-product-card:hover {
          border-color: #1a3c34;
          background: rgba(26, 60, 52, 0.05);
        }
        .gifts-product-image-wrap {
          position: relative;
          width: 56px;
          height: 56px;
          margin: 0 auto 8px;
          border-radius: 8px;
          overflow: hidden;
          background: var(--pastel-cream);
        }
        .gifts-product-image-placeholder {
          width: 100%;
          height: 100%;
          background: var(--pastel-cream);
        }
        .gifts-product-name {
          font-size: 12px;
          font-weight: 600;
          margin: 0 0 4px;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gifts-product-price {
          font-size: 10px;
          color: #c5a059;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
