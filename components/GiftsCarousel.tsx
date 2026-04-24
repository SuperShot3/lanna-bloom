'use client';

import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import type { CatalogProduct } from '@/lib/sanity';
import type { Locale } from '@/lib/i18n';
import { computeFinalPrice } from '@/lib/partnerPricing';
import { useCart } from '@/contexts/CartContext';
import { getDefaultAddOns } from '@/components/AddOnsSection';
import { trackAddToCart, trackRemoveFromCart } from '@/lib/analytics';
import { getProductDisplayCategory } from '@/lib/catalogCategories';
import interest from '@/components/interestCarouselItem.module.css';

/** Visible name length on gift tiles (full name in title + aria-label; price is not clipped). */
const GIFT_TILE_NAME_MAX = 7;

function clipGiftTileName(text: string, max = GIFT_TILE_NAME_MAX): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, max).join('')}…`;
}

export function GiftsCarousel({ gifts, lang }: { gifts: CatalogProduct[]; lang: Locale }) {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    loop: gifts.length > 2,
    skipSnaps: false,
    duration: 35,
  });
  const { addItem, removeItem, items } = useCart();
  if (!gifts.length) return null;

  const defaultAddOns = getDefaultAddOns();

  const findCartIndex = (product: CatalogProduct) =>
    items.findIndex(
      (i) =>
        i.bouquetId === product.id &&
        i.itemType === 'product' &&
        i.size.optionId === 'product_default' &&
        (i.addOns.cardMessage ?? '').trim() === (defaultAddOns.cardMessage ?? '').trim() &&
        JSON.stringify(i.addOns.productAddOns ?? {}) === JSON.stringify(defaultAddOns.productAddOns ?? {})
    );

  const isInCart = (product: CatalogProduct) => findCartIndex(product) >= 0;

  const handleToggleGift = (product: CatalogProduct) => {
    const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
    const imgSrc = product.images?.[0] ?? '';
    const finalPrice = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);
    const index = findCartIndex(product);

    if (index >= 0) {
      removeItem(index);
      trackRemoveFromCart({
        currency: 'THB',
        value: finalPrice,
        items: [
          {
            item_id: product.id,
            item_name: name,
            price: finalPrice,
            quantity: 1,
            index: 0,
            item_category: getProductDisplayCategory(product),
          },
        ],
      });
    } else {
      const syntheticSize = {
        optionId: 'product_default',
        key: 'm' as const,
        label: '—',
        price: finalPrice,
        description: '',
        preparationTime: undefined as number | undefined,
        availability: true,
      };
      addItem(
        {
          itemType: 'product',
          bouquetId: product.id,
          slug: product.slug,
          nameEn: product.nameEn,
          nameTh: product.nameTh ?? product.nameEn,
          imageUrl: imgSrc,
          size: syntheticSize,
          addOns: defaultAddOns,
        },
        1
      );
      trackAddToCart({
        currency: 'THB',
        value: finalPrice,
        items: [
          {
            item_id: product.id,
            item_name: name,
            price: finalPrice,
            quantity: 1,
            index: 0,
            item_category: getProductDisplayCategory(product),
          },
        ],
      });
    }
  };

  return (
    <div className="gifts-carousel-wrap">
      <div className="gifts-carousel-viewport" ref={emblaRef}>
        <div className="gifts-carousel-container">
          {gifts.map((product) => {
            const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
            const imgSrc = product.images?.[0] ?? '';
            const isDataUrl = typeof imgSrc === 'string' && imgSrc.startsWith('data:');
            const finalPrice = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);
            const inCart = isInCart(product);
            const priceLabel = `฿${finalPrice.toLocaleString()}`;

            return (
              <div key={product.id} className="gifts-carousel-slide">
                <div className={interest.frame}>
                  <button
                    type="button"
                    className={`${interest.surface} ${interest.surfaceWithCover}`}
                    onClick={() => handleToggleGift(product)}
                    aria-label={inCart ? `${name} — Added` : `${name} — ฿${finalPrice.toLocaleString()} — Add to cart`}
                  >
                    {imgSrc ? (
                      <span className={interest.surfaceCover} aria-hidden>
                        <Image
                          src={imgSrc}
                          alt=""
                          fill
                          sizes="(max-width: 480px) 50vw, (max-width: 640px) 34vw, 26vw"
                          className={`${interest.surfaceCoverImage} gifts-product-image`}
                          style={{ objectFit: 'contain', objectPosition: 'center center' }}
                          unoptimized={isDataUrl}
                          draggable={false}
                        />
                      </span>
                    ) : (
                      <span className={interest.surfaceCoverPlaceholder} aria-hidden />
                    )}
                    {inCart && (
                      <span className={interest.checkmark} aria-hidden>
                        ✓
                      </span>
                    )}
                    <span className={interest.surfaceStack}>
                      <div className={interest.meta}>
                        <p className={interest.name} title={name}>
                          {clipGiftTileName(name)}
                        </p>
                        <p className={interest.price}>{priceLabel}</p>
                      </div>
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {gifts.length > 1 && (
        <p className="gifts-carousel-swipe-hint" aria-hidden>
          {lang === 'th' ? 'เลื่อนเพื่อดูเพิ่มเติม' : 'Swipe to browse'}
        </p>
      )}
      <style jsx>{`
        .gifts-carousel-wrap {
          position: relative;
          margin-bottom: 20px;
          /* Room so tile frames are not clipped by viewport overflow */
          padding-top: 6px;
          padding-bottom: 4px;
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
          gap: 7px;
          margin-left: -7px;
        }
        .gifts-carousel-slide {
          flex: 0 0 45%;
          min-width: 0;
          padding: 4px 0 8px 7px;
          box-sizing: border-box;
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
        .gifts-carousel-swipe-hint {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}
