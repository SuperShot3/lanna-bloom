'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useEmblaCarousel from 'embla-carousel-react';
import type { Bouquet } from '@/lib/bouquets';
import type { Locale } from '@/lib/i18n';
import { trackSelectItem } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';
import { getBouquetDisplayCategory } from '@/lib/catalogCategories';
import interest from '@/components/interestCarouselItem.module.css';
import { buildCatalogItemHref } from '@/lib/delivery/marketRoute';
import { useCheckoutDeliveryProfile } from '@/hooks/useCheckoutDeliveryProfile';
import { applyExpansionItemMarkupThb } from '@/lib/expansionMarkup';

export function BouquetsCarousel({ bouquets, lang }: { bouquets: Bouquet[]; lang: Locale }) {
  const pathname = usePathname();
  const checkoutProfile = useCheckoutDeliveryProfile(lang);
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    loop: bouquets.length > 2,
    skipSnaps: false,
    duration: 35,
  });

  if (!bouquets.length) return null;

  return (
    <div className="bouquets-carousel-wrap">
      <div className="bouquets-carousel-viewport" ref={emblaRef}>
        <div className="bouquets-carousel-container">
          {bouquets.map((bouquet) => {
            const name = lang === 'th' && bouquet.nameTh ? bouquet.nameTh : bouquet.nameEn;
            const imgSrc = bouquet.images?.[0] ?? '';
            const isDataUrl = typeof imgSrc === 'string' && imgSrc.startsWith('data:');
            const minPrice =
              bouquet.sizes?.length > 0 ? Math.min(...bouquet.sizes.map((s) => s.price)) : 0;
            const displayMinPrice = applyExpansionItemMarkupThb(
              minPrice,
              checkoutProfile.destinationId
            );
            const href = buildCatalogItemHref({ lang, slug: bouquet.slug, pathname });

            const handleClick = () => {
              const item: AnalyticsItem = {
                item_id: bouquet.id,
                item_name: name,
                item_category: getBouquetDisplayCategory(bouquet),
                price: displayMinPrice,
                quantity: 1,
                index: 0,
              };
              trackSelectItem('plushy_cross_sell_bouquets', item);
            };

            return (
              <div key={bouquet.id} className="bouquets-carousel-slide">
                <div className={interest.frame}>
                  <Link
                    href={href}
                    className={interest.surface}
                    onClick={handleClick}
                    data-ga-select-item="plushy_cross_sell_bouquets"
                  >
                    <div className={interest.imageWrap}>
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={name}
                          fill
                          sizes="84px"
                          className={`${interest.carouselFillImage} bouquets-product-image`}
                          unoptimized={isDataUrl || imgSrc.includes('supabase.co')}
                          draggable={false}
                        />
                      ) : (
                        <div className={interest.imagePlaceholder} aria-hidden />
                      )}
                    </div>
                    <div className={interest.meta}>
                      <p className={interest.name} title={name}>
                        {name}
                      </p>
                      <p className={interest.price}>
                        {lang === 'th' ? 'เริ่มต้น ' : 'From '}฿{displayMinPrice.toLocaleString()}
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {bouquets.length > 1 && (
        <p className="bouquets-carousel-swipe-hint" aria-hidden>
          {lang === 'th' ? 'เลื่อนเพื่อดูเพิ่มเติม' : 'Swipe to browse'}
        </p>
      )}
      <style jsx>{`
        .bouquets-carousel-wrap {
          position: relative;
          margin-bottom: 20px;
          padding-top: 6px;
          padding-bottom: 4px;
        }
        .bouquets-carousel-viewport {
          overflow: hidden;
          touch-action: pan-y pinch-zoom;
          cursor: grab;
          -webkit-overflow-scrolling: touch;
        }
        .bouquets-carousel-viewport:active {
          cursor: grabbing;
        }
        .bouquets-carousel-container {
          display: flex;
          gap: 7px;
          margin-left: -7px;
        }
        .bouquets-carousel-slide {
          flex: 0 0 45%;
          min-width: 0;
          padding: 4px 0 8px 7px;
          box-sizing: border-box;
        }
        @media (min-width: 480px) {
          .bouquets-carousel-slide {
            flex: 0 0 33.333%;
          }
        }
        @media (min-width: 640px) {
          .bouquets-carousel-slide {
            flex: 0 0 25%;
          }
        }
        .bouquets-carousel-swipe-hint {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}
