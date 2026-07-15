'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { CatalogProduct } from '@/lib/sanity';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { trackSelectItem, trackAddToCart } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';
import { computeFinalPrice } from '@/lib/partnerPricing';
import { getProductDisplayCategory } from '@/lib/catalogCategories';
import { optionDisplayLabel } from '@/lib/bouquetOptions';
import { useCart } from '@/contexts/CartContext';
import { getDefaultAddOns } from '@/components/AddOnsSection';
import { buildCatalogItemHref } from '@/lib/delivery/marketRoute';
import { useCheckoutDeliveryProfile } from '@/hooks/useCheckoutDeliveryProfile';
import { applyExpansionItemMarkupThb } from '@/lib/expansionMarkup';
import {
  applyCatalogDiscountThb,
  effectiveCatalogUnitPriceWithExpansion,
} from '@/lib/catalogDiscount';
import { CatalogDiscountBadge } from '@/components/CatalogDiscountBadge';
import { StorefrontIcon } from '@/components/icons';
import { CatalogDiscountPrice } from '@/components/CatalogDiscountPrice';
import {
  catalogImageUnoptimized,
  CATALOG_CARD_IMAGE_SIZES,
  CATALOG_PDP_PRELOAD_WIDTH,
  preloadCatalogImage,
} from '@/lib/catalog/catalogImage';

const SWIPE_THRESHOLD_PX = 50;

export function ProductCard({
  product,
  lang,
  alwaysShowActions = false,
  simpleActions = false,
}: {
  product: CatalogProduct;
  lang: Locale;
  alwaysShowActions?: boolean;
  /** Inline Buy 1-Click + Add to cart only (no expandable options panel). */
  simpleActions?: boolean;
}) {
  const t = translations[lang].catalog;
  const tCart = translations[lang].cart;
  const pathname = usePathname();
  const router = useRouter();
  const { addItem } = useCart();
  const checkoutProfile = useCheckoutDeliveryProfile(lang);
  const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
  const href = buildCatalogItemHref({ lang, slug: product.slug, pathname });
  const finalPrice = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);
  const discountedBase = applyCatalogDiscountThb(finalPrice, product.discountPercent);
  const isPlushyToys = product.catalogKind === 'plushyToy' || product.category === 'plushy_toys';
  const isBalloon = product.catalogKind === 'balloon' || product.category === 'balloons';
  const isStandaloneProduct = isPlushyToys || isBalloon;
  const sizeLabel = (product.sizeLabel || '').trim();
  const availableSizes = useMemo(
    () => (product.sizes ?? []).filter((s) => s.availability !== false),
    [product.sizes]
  );
  const hasMultipleSizes = availableSizes.length > 1;
  const listBasePrice = hasMultipleSizes
    ? Math.min(...availableSizes.map((s) => s.price))
    : finalPrice;
  const displayFromPrice = effectiveCatalogUnitPriceWithExpansion(
    listBasePrice,
    product.discountPercent,
    checkoutProfile.destinationId
  );

  const images = useMemo(() => {
    const raw = product.images ?? [];
    return raw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  }, [product.images]);

  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => {
    setImageIndex(0);
  }, [product.id]);

  const imgSrc = isStandaloneProduct
    ? (images[imageIndex] ?? images[0] ?? '')
    : (product.images?.[0] ?? '');
  const imgAlt = isStandaloneProduct
    ? (product.imageAlts?.[imageIndex]?.trim() || product.imageAlts?.[0]?.trim() || name)
    : (product.imageAlts?.[0]?.trim() || name);
  const handlePdpImagePreload = useCallback(() => {
    if (imgSrc) preloadCatalogImage(imgSrc, CATALOG_PDP_PRELOAD_WIDTH);
  }, [imgSrc]);
  const canSwipeStandaloneImages = isStandaloneProduct && images.length > 1;

  const touchStartX = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const mouseStartX = useRef<number | null>(null);
  const mouseUpListenerRef = useRef<((e: MouseEvent) => void) | null>(null);

  const goPrevImage = useCallback(() => {
    setImageIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const goNextImage = useCallback(() => {
    setImageIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current == null || !canSwipeStandaloneImages) {
        touchStartX.current = null;
        return;
      }
      const endX = e.changedTouches[0].clientX;
      const delta = endX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
        didSwipeRef.current = true;
        if (delta < 0) goNextImage();
        else goPrevImage();
        window.setTimeout(() => {
          didSwipeRef.current = false;
        }, 450);
      }
    },
    [canSwipeStandaloneImages, goNextImage, goPrevImage]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!canSwipeStandaloneImages) return;
      mouseStartX.current = e.clientX;
      const onMouseUp = (upEv: MouseEvent) => {
        window.removeEventListener('mouseup', onMouseUp);
        mouseUpListenerRef.current = null;
        if (mouseStartX.current == null) return;
        const delta = upEv.clientX - mouseStartX.current;
        mouseStartX.current = null;
        if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
          didSwipeRef.current = true;
          if (delta < 0) goNextImage();
          else goPrevImage();
          window.setTimeout(() => {
            didSwipeRef.current = false;
          }, 450);
        }
      };
      mouseUpListenerRef.current = onMouseUp;
      window.addEventListener('mouseup', onMouseUp);
    },
    [canSwipeStandaloneImages, goNextImage, goPrevImage]
  );

  useEffect(() => {
    return () => {
      if (mouseUpListenerRef.current) {
        window.removeEventListener('mouseup', mouseUpListenerRef.current);
        mouseUpListenerRef.current = null;
      }
    };
  }, []);

  const [hovered, setHovered] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState(
    () => availableSizes[availableSizes.length - 1]?.optionId ?? 'product_default'
  );
  const [justAdded, setJustAdded] = useState(false);
  const [actionsPinned, setActionsPinned] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);

  const expandablePanel = !simpleActions;

  useEffect(() => {
    if (!expandablePanel) return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => {
      const shouldPin = alwaysShowActions && !media.matches;
      setActionsPinned(shouldPin);
      setHovered(shouldPin);
    };

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [alwaysShowActions, expandablePanel]);

  useEffect(() => {
    if (!expandablePanel) return;
    const media = window.matchMedia('(max-width: 639px)');
    const sync = () => setShowMobileActions(media.matches);

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [expandablePanel]);

  useEffect(() => {
    if (!hasMultipleSizes) return;
    setSelectedOptionId(availableSizes[availableSizes.length - 1]?.optionId ?? 'product_default');
  }, [availableSizes, hasMultipleSizes, product.id]);

  const selectedSize =
    availableSizes.find((s) => s.optionId === selectedOptionId) ?? availableSizes[0];

  const handleLinkClick = () => {
    const item: AnalyticsItem = {
      item_id: product.id,
      item_name: name,
      item_category: getProductDisplayCategory(product),
      price: displayFromPrice,
      quantity: 1,
      index: 0,
    };
    trackSelectItem('catalog', item);
  };

  const handleLinkClickGuarded = (e: React.MouseEvent) => {
    if (didSwipeRef.current) {
      e.preventDefault();
      return;
    }
    handleLinkClick();
  };

  const pushToCart = useCallback(
    (mode: 'stay' | 'checkout') => {
      const itemType = isBalloon ? 'balloon' : isPlushyToys ? 'plushyToy' : 'product';
      const cartSize = hasMultipleSizes && selectedSize
        ? {
            optionId: selectedSize.optionId,
            key: selectedSize.key ?? ('m' as const),
            label: optionDisplayLabel(selectedSize, lang),
            price: applyCatalogDiscountThb(selectedSize.price, product.discountPercent),
            description: selectedSize.description ?? '',
          }
        : {
            optionId: 'product_default',
            key: 'm' as const,
            label: sizeLabel || '—',
            price: discountedBase,
            description: '',
          };
      const displayUnitPrice = effectiveCatalogUnitPriceWithExpansion(
        hasMultipleSizes && selectedSize ? selectedSize.price : finalPrice,
        product.discountPercent,
        checkoutProfile.destinationId
      );
      addItem(
        {
          itemType,
          bouquetId: product.id,
          slug: product.slug,
          nameEn: product.nameEn,
          nameTh: product.nameTh ?? product.nameEn,
          imageUrl: imgSrc || undefined,
          size: cartSize,
          addOns: getDefaultAddOns(),
          excludedDeliveryDestinations: product.excludedDeliveryDestinations,
        },
        1
      );
      trackAddToCart({
        currency: 'THB',
        value: displayUnitPrice,
        items: [
          {
            item_id: product.id,
            item_name: name,
            price: displayUnitPrice,
            quantity: 1,
            index: 0,
            item_category: getProductDisplayCategory(product),
            item_variant: hasMultipleSizes && selectedSize
              ? optionDisplayLabel(selectedSize, lang)
              : sizeLabel || undefined,
          },
        ],
      });
      if (mode === 'stay') {
        setJustAdded(true);
        window.setTimeout(() => setJustAdded(false), 6000);
      } else {
        router.push(`/${lang}/cart`);
      }
    },
    [
      addItem,
      checkoutProfile.destinationId,
      discountedBase,
      finalPrice,
      hasMultipleSizes,
      imgSrc,
      isBalloon,
      isPlushyToys,
      lang,
      name,
      product,
      router,
      selectedSize,
      sizeLabel,
    ]
  );

  const radioName = `product-opt-${product.id}`;

  return (
    <article
      className={`pcard ${alwaysShowActions ? 'pcard--always-actions' : ''} ${simpleActions ? 'pcard--simple-actions' : ''}`}
      data-expanded={expandablePanel && hovered ? 'true' : 'false'}
      onMouseEnter={() => {
        if (expandablePanel && !actionsPinned) setHovered(true);
      }}
      onMouseLeave={() => {
        if (expandablePanel && !actionsPinned) setHovered(false);
      }}
    >
      <Link
        href={href}
        className="pcard-link"
        data-ga-select-item="catalog"
        onClick={handleLinkClickGuarded}
        onMouseEnter={handlePdpImagePreload}
        onTouchStart={handlePdpImagePreload}
        aria-label={`${name} — ${t.from} ฿${displayFromPrice.toLocaleString()}`}
      >
        <div
          className="pcard-image-wrap"
          style={canSwipeStandaloneImages ? { touchAction: 'pan-y' as const } : undefined}
          onTouchStart={canSwipeStandaloneImages ? handleTouchStart : undefined}
          onTouchEnd={canSwipeStandaloneImages ? handleTouchEnd : undefined}
          onMouseDown={canSwipeStandaloneImages ? handleMouseDown : undefined}
          aria-label={canSwipeStandaloneImages ? (lang === 'th' ? 'เลื่อนเพื่อดูรูปเพิ่ม' : 'Swipe to see more images') : undefined}
        >
          {product.isHit ? <span className="pcard-hit">{t.hitBadge}</span> : null}
          <CatalogDiscountBadge
            discountPercent={product.discountPercent}
            ariaLabel={t.discountAria ?? 'On sale — {percent}% off'}
          />
          {isPlushyToys ? (
            <span className="pcard-toy-icon" aria-hidden>
              <Image
                src="/icons/toy-teddy-bear-baby-svgrepo-com.svg"
                alt=""
                width={22}
                height={22}
                unoptimized
                draggable={false}
              />
            </span>
          ) : null}
          {imgSrc ? (
            <div className="pcard-image-shared">
              <Image
                src={imgSrc}
                alt={imgAlt}
                width={400}
                height={400}
                className="pcard-image"
                sizes={CATALOG_CARD_IMAGE_SIZES}
                unoptimized={catalogImageUnoptimized(imgSrc)}
                draggable={false}
                style={{ pointerEvents: 'none' }}
              />
            </div>
          ) : (
            <div className="pcard-image pcard-image-placeholder" aria-hidden />
          )}
          {canSwipeStandaloneImages ? (
            <div className="pcard-dots" aria-hidden>
              {images.map((_, i) => (
                <span key={i} className={`pcard-dot ${i === imageIndex ? 'active' : ''}`} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="pcard-body">
          <div className="pcard-name" title={name}>
            {name}
          </div>
          <div className="pcard-price">
            <CatalogDiscountPrice
              basePriceThb={finalPrice}
              discountPercent={product.discountPercent}
              destinationId={checkoutProfile.destinationId}
              lang={lang}
              fromLabel={t.from}
              amountClassName="pcard-price-amount"
            />
          </div>
          {isStandaloneProduct && sizeLabel ? <div className="pcard-size">Size: {sizeLabel}</div> : null}
        </div>
      </Link>

      {simpleActions ? (
        <div
          className="pcard-simple-actions"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button type="button" className="pcard-simple-buy" onClick={() => pushToCart('checkout')}>
            <StorefrontIcon name="bolt" filled size={18} />
            <span>{t.buyInOneClick}</span>
          </button>
          <button
            type="button"
            className="pcard-simple-cart"
            onClick={() => (justAdded ? router.push(`/${lang}/cart`) : pushToCart('stay'))}
          >
            <StorefrontIcon name={justAdded ? 'shopping-bag' : 'shopping-cart'} size={18} />
            <span>{justAdded ? tCart.goToCart : tCart.addToCart}</span>
          </button>
        </div>
      ) : null}

      {expandablePanel && showMobileActions && (
        <div
          className="pcard-mobile-actions"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button type="button" className="pcard-mobile-buy" onClick={() => pushToCart('checkout')}>
            <StorefrontIcon name="bolt" filled size={18} />
            <span>{t.buyInOneClick}</span>
          </button>
          <button
            type="button"
            className="pcard-mobile-cart"
            onClick={() => (justAdded ? router.push(`/${lang}/cart`) : pushToCart('stay'))}
          >
            <StorefrontIcon name={justAdded ? 'shopping-bag' : 'shopping-cart'} size={18} />
            <span>{justAdded ? tCart.goToCart : tCart.addToCart}</span>
          </button>
        </div>
      )}

      {expandablePanel ? (
        <div
          className="pcard-panel"
          aria-hidden={!hovered}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
        <div className="pcard-panel-inner">
          {hasMultipleSizes ? (
            <>
              <p className="pcard-options-title">{t.productCardOptions}</p>
              <ul className="pcard-option-list" role="list">
                {availableSizes.map((row) => {
                  const isChecked = selectedOptionId === row.optionId;
                  return (
                    <li key={row.optionId} className="pcard-option">
                      <label className="pcard-option-label">
                        <input
                          type="radio"
                          className="pcard-radio"
                          name={radioName}
                          checked={isChecked}
                          onChange={() => setSelectedOptionId(row.optionId)}
                        />
                        <span className="pcard-label-text">
                          {optionDisplayLabel(row, lang)}
                          {isChecked ? (
                            <span className="pcard-check" aria-hidden>
                              {' '}
                              ✓
                            </span>
                          ) : null}
                        </span>
                      </label>
                      <span className="pcard-option-price">
                        ฿{effectiveCatalogUnitPriceWithExpansion(
                          row.price,
                          product.discountPercent,
                          checkoutProfile.destinationId
                        ).toLocaleString()}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
          {justAdded ? (
            <>
              <p className="pcard-added" role="status">
                {tCart.addedToCart}
              </p>
              <button
                type="button"
                className={`pcard-btn-cart ${isStandaloneProduct ? 'pcard-btn-cart--plushy' : ''}`}
                onClick={() => router.push(`/${lang}/cart`)}
              >
                {tCart.goToCart}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`pcard-btn-cart ${isStandaloneProduct ? 'pcard-btn-cart--plushy' : ''}`}
                onClick={() => pushToCart('stay')}
              >
                {tCart.addToCart}
              </button>
              <button type="button" className="pcard-buy-1" onClick={() => pushToCart('checkout')}>
                {t.buyInOneClick}
              </button>
            </>
          )}
        </div>
      </div>
      ) : null}

      <style jsx>{`
        .pcard {
          position: relative;
          background: var(--surface);
          border-radius: var(--radius);
          overflow: visible;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          transition: box-shadow 0.2s ease, border-radius 0.2s ease;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          z-index: 1;
        }
        .pcard[data-expanded='true'] {
          z-index: 50;
          box-shadow: var(--shadow-hover);
          border-bottom: none;
          border-radius: var(--radius) var(--radius) 0 0;
        }
        .pcard-link {
          display: flex;
          flex-direction: column;
          text-decoration: none;
          color: inherit;
          min-width: 0;
          border-radius: var(--radius);
          overflow: hidden;
        }
        .pcard-image-wrap {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          background: var(--pastel-cream);
        }
        .pcard-hit {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 2;
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          background: var(--pastel-mint);
          color: var(--primary);
        }
        .pcard-toy-icon {
          position: absolute;
          bottom: 10px;
          right: 10px;
          z-index: 2;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(45, 42, 38, 0.08);
          box-shadow: 0 2px 10px rgba(45, 42, 38, 0.1);
          pointer-events: none;
        }
        .pcard-toy-icon :global(img) {
          display: block;
          width: 22px;
          height: 22px;
          object-fit: contain;
        }
        .pcard-dots {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          pointer-events: none;
          z-index: 3;
        }
        .pcard-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          transition: background 0.2s;
        }
        .pcard-dot.active {
          background: var(--accent);
        }
        .pcard-image-shared {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        .pcard-image {
          object-fit: cover;
          object-position: top center;
          width: 100%;
          height: 100%;
        }
        .pcard-image-placeholder {
          width: 100%;
          height: 100%;
          background: var(--pastel-cream);
        }
        .pcard-body {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          min-height: 84px;
          min-width: 0;
        }
        .pcard-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pcard-price {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          font-size: 1.02rem;
          color: var(--text);
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.01em;
        }
        .pcard-price-from {
          color: var(--text-muted);
          font-size: 0.92rem;
          font-weight: 500;
        }
        .pcard-price-amount {
          font-weight: 800;
        }
        .pcard-size {
          margin-top: 6px;
          font-size: 0.9rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .pcard-panel {
          position: absolute;
          left: -1px;
          right: -1px;
          top: 100%;
          margin-top: 0;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.32s ease;
          background: var(--surface);
          border: 1px solid var(--border);
          border-top: none;
          border-radius: 0 0 var(--radius) var(--radius);
          box-shadow: 0 12px 28px rgba(45, 42, 38, 0.08);
          pointer-events: none;
          z-index: 2;
        }
        .pcard[data-expanded='true'] .pcard-panel {
          max-height: 320px;
          pointer-events: auto;
        }
        @media (hover: none) {
          .pcard-panel {
            display: none;
          }
          .pcard--always-actions .pcard-panel {
            display: block;
            pointer-events: auto;
          }
        }
        /* Only hide on devices that truly have no hover (e.g. phones). Do NOT use pointer:coarse — many laptops report coarse and would never see the panel. */
        @media (hover: none) {
          .pcard-panel {
            display: none;
          }
        }

        .pcard-panel-inner {
          padding: 10px 14px 14px;
        }
        .pcard-mobile-actions {
          display: none;
        }
        .pcard-simple-actions {
          display: grid;
          grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.92fr);
          gap: 8px;
          padding: 0 12px 12px;
        }
        .pcard--simple-actions {
          overflow: hidden;
          z-index: 1;
        }
        .pcard--simple-actions[data-expanded='true'] {
          z-index: 1;
          border-bottom: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }
        .pcard-simple-actions button {
          min-width: 0;
          min-height: 40px;
          box-sizing: border-box;
          padding: 0 10px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.15;
          cursor: pointer;
          touch-action: manipulation;
        }
        .pcard-simple-actions .storefront-icon {
          font-size: 18px;
          line-height: 1;
          flex: 0 0 auto;
        }
        .pcard-simple-buy {
          border: 1px solid rgba(26, 60, 52, 0.18);
          background: var(--primary);
          color: #fff;
        }
        .pcard-simple-cart {
          border: 1px solid rgba(197, 160, 89, 0.5);
          background: #fff;
          color: var(--text);
        }
        .pcard-simple-actions button:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .pcard-options-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          margin: 0 0 8px;
          letter-spacing: 0.02em;
        }
        .pcard-option-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .pcard-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 4px 0;
          font-size: 12px;
          color: var(--text);
        }
        .pcard-option--disabled {
          color: var(--text-muted);
          opacity: 0.75;
        }
        .pcard-option-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          min-width: 0;
        }
        .pcard-option--disabled .pcard-option-label {
          cursor: not-allowed;
        }
        .pcard-radio {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          margin: 0;
          accent-color: var(--primary);
        }
        .pcard-check {
          color: var(--primary);
          font-weight: 700;
        }
        .pcard-option-price {
          color: var(--text-muted);
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }
        .pcard-option-right {
          font-size: 11px;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .pcard-btn-cart {
          display: block;
          width: 100%;
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(26, 60, 52, 0.14);
          border-radius: var(--radius-sm);
          background: var(--pastel-mint);
          color: var(--primary);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s, border-color 0.2s;
        }
        .pcard-btn-cart:hover {
          background: #dceee4;
        }
        .pcard-btn-cart--plushy {
          background: var(--accent);
          color: var(--accent-cta-text, #1a3c34);
          border: 2px solid var(--accent-border);
          box-shadow: 0 3px 0 var(--accent-border), 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .pcard-btn-cart--plushy:hover {
          background: var(--accent-border);
          border-color: var(--accent-border);
          box-shadow: 0 3px 0 var(--accent-border), 0 6px 16px rgba(0, 0, 0, 0.18);
        }
        .pcard-btn-cart--plushy:active {
          transform: translateY(1px);
          box-shadow: 0 2px 0 var(--accent-border), 0 3px 8px rgba(0, 0, 0, 0.12);
        }
        .pcard-btn-cart:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .pcard-buy-1 {
          display: block;
          width: 100%;
          margin-top: 8px;
          padding: 0;
          border: none;
          background: none;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
          font-family: inherit;
        }
        .pcard-buy-1:hover {
          color: var(--accent-border);
        }
        .pcard-buy-1:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-radius: 4px;
        }

        .pcard-added {
          margin: 12px 0 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--primary);
          text-align: center;
        }
        @media (max-width: 639px) {
          .pcard-body {
            padding: 9px 10px 8px;
            min-height: 78px;
          }
          .pcard-name {
            font-family: var(--font-serif);
            font-size: 15px;
            line-height: 1.2;
            margin-bottom: 5px;
          }
          .pcard-price {
            gap: 4px;
            font-size: 14px;
          }
          .pcard-price-from {
            font-size: 14px;
          }
          .pcard-size {
            font-size: 11px;
            margin-top: 4px;
          }
          .pcard-mobile-actions {
            display: grid;
            grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.92fr);
            gap: 6px;
            padding: 0 10px 10px;
          }
          .pcard-mobile-actions button {
            min-width: 0;
            min-height: 32px;
            box-sizing: border-box;
            padding: 0 4px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
            font-family: inherit;
            font-size: clamp(10px, 2.25vw, 11px);
            font-weight: 700;
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
            cursor: pointer;
            touch-action: manipulation;
          }
          .pcard-mobile-actions .storefront-icon {
            font-size: 13px;
            line-height: 1;
            flex: 0 0 auto;
          }
          .pcard-mobile-actions button span:last-child {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .pcard-mobile-buy {
            border: 1px solid rgba(26, 60, 52, 0.18);
            background: var(--primary);
            color: #fff;
          }
          .pcard-mobile-cart {
            border: 1px solid rgba(197, 160, 89, 0.5);
            background: #fff;
            color: var(--text);
          }
          .pcard-mobile-actions button:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
          }
        }
      `}</style>
    </article>
  );
}
