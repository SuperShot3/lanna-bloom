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
import { catalogImageUnoptimized } from '@/lib/catalog/catalogImage';

type BouquetsCarouselProps = {
  bouquets: Bouquet[];
  lang: Locale;
  listName?: string;
  /** `pdpSimilar` — larger equal-size tiles for bouquet PDP recommendations (≤3 items). */
  variant?: 'default' | 'pdpSimilar';
};

function BouquetCarouselTile({
  bouquet,
  lang,
  listName,
  index,
  variant,
}: {
  bouquet: Bouquet;
  lang: Locale;
  listName: string;
  index: number;
  variant: 'default' | 'pdpSimilar';
}) {
  const pathname = usePathname();
  const checkoutProfile = useCheckoutDeliveryProfile(lang);
  const isPdpSimilar = variant === 'pdpSimilar';
  const name = lang === 'th' && bouquet.nameTh ? bouquet.nameTh : bouquet.nameEn;
  const imgSrc = bouquet.images?.[0] ?? '';
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
      index,
    };
    trackSelectItem(listName, item);
  };

  const frameClass = isPdpSimilar ? interest.framePdpSimilar : interest.frame;
  const surfaceClass = isPdpSimilar ? interest.surfacePdpSimilar : interest.surface;
  const imageWrapClass = isPdpSimilar ? interest.imageWrapPdpSimilar : interest.imageWrap;
  const metaClass = isPdpSimilar ? interest.metaPdpSimilar : interest.meta;
  const nameClass = isPdpSimilar
    ? `${interest.name} ${interest.nameFixedLines}`
    : interest.name;
  const priceClass = isPdpSimilar
    ? `${interest.price} ${interest.priceFixedLine}`
    : interest.price;
  const placeholderClass = isPdpSimilar
    ? interest.imagePlaceholderPdpSimilar
    : interest.imagePlaceholder;
  const imageSizes = isPdpSimilar
    ? '(max-width: 480px) 30vw, (max-width: 768px) 24vw, 220px'
    : '84px';

  return (
    <div className={frameClass}>
      <Link
        href={href}
        className={surfaceClass}
        onClick={handleClick}
        data-ga-select-item={listName}
      >
        <div className={imageWrapClass}>
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={name}
              fill
              sizes={imageSizes}
              className={`${interest.carouselFillImage} bouquets-product-image`}
              unoptimized={catalogImageUnoptimized(imgSrc)}
              draggable={false}
            />
          ) : (
            <div className={placeholderClass} aria-hidden />
          )}
        </div>
        <div className={metaClass}>
          <p className={nameClass} title={name}>
            {name}
          </p>
          <p className={priceClass}>
            {lang === 'th' ? 'เริ่มต้น ' : 'From '}฿{displayMinPrice.toLocaleString()}
          </p>
        </div>
      </Link>
    </div>
  );
}

function BouquetsCarouselDefault({
  bouquets,
  lang,
  listName,
}: BouquetsCarouselProps & { listName: string }) {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    loop: bouquets.length > 2,
    skipSnaps: false,
    duration: 35,
  });

  return (
    <div className="bouquets-carousel-wrap">
      <div className="bouquets-carousel-viewport" ref={emblaRef}>
        <div className="bouquets-carousel-container">
          {bouquets.map((bouquet, index) => (
            <div key={bouquet.id} className="bouquets-carousel-slide">
              <BouquetCarouselTile
                bouquet={bouquet}
                lang={lang}
                listName={listName}
                index={index}
                variant="default"
              />
            </div>
          ))}
        </div>
      </div>
      {bouquets.length > 3 && (
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

function BouquetsCarouselPdpSimilar({
  bouquets,
  lang,
  listName,
}: BouquetsCarouselProps & { listName: string }) {
  return (
    <div className="bouquets-pdp-similar-grid">
      {bouquets.map((bouquet, index) => (
        <div key={bouquet.id} className="bouquets-pdp-similar-cell">
          <BouquetCarouselTile
            bouquet={bouquet}
            lang={lang}
            listName={listName}
            index={index}
            variant="pdpSimilar"
          />
        </div>
      ))}
      <style jsx>{`
        .bouquets-pdp-similar-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          align-items: stretch;
        }
        .bouquets-pdp-similar-cell {
          display: flex;
          min-width: 0;
          min-height: 0;
        }
        @media (min-width: 768px) {
          .bouquets-pdp-similar-grid {
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}

export function BouquetsCarousel({
  bouquets,
  lang,
  listName = 'plushy_cross_sell_bouquets',
  variant = 'default',
}: BouquetsCarouselProps) {
  if (!bouquets.length) return null;

  if (variant === 'pdpSimilar') {
    return (
      <BouquetsCarouselPdpSimilar bouquets={bouquets} lang={lang} listName={listName} />
    );
  }

  return (
    <BouquetsCarouselDefault bouquets={bouquets} lang={lang} listName={listName} variant={variant} />
  );
}
