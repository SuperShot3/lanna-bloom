'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CatalogProduct } from '@/lib/sanity';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { trackSelectItem, trackAddToCart } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';
import { computeFinalPrice } from '@/lib/partnerPricing';
import { getProductDisplayCategory } from '@/lib/catalogCategories';
import type { SizeKey } from '@/lib/bouquets';
import { useCart } from '@/contexts/CartContext';
import { getDefaultAddOns } from '@/components/AddOnsSection';

const SWIPE_THRESHOLD_PX = 50;

type OptionRow = {
  id: string;
  label: string;
  price: number;
  available: boolean;
  sizeKey: SizeKey;
};

function buildSyntheticOptions(
  baseThb: number,
  labels: {
    elegant: string;
    compact: string;
    standard: string;
    business: string;
  }
): OptionRow[] {
  const base = Math.max(1, Math.round(baseThb));
  return [
    {
      id: 'elegant',
      label: labels.elegant,
      price: Math.round(base * 1.12),
      available: false,
      sizeKey: 's',
    },
    {
      id: 'compact',
      label: labels.compact,
      price: Math.round(base * 0.62),
      available: true,
      sizeKey: 's',
    },
    {
      id: 'standard',
      label: labels.standard,
      price: base,
      available: true,
      sizeKey: 'm',
    },
    {
      id: 'business',
      label: labels.business,
      price: Math.round(base * 1.84),
      available: true,
      sizeKey: 'l',
    },
  ];
}

export function ProductCard({ product, lang }: { product: CatalogProduct; lang: Locale }) {
  const t = translations[lang].catalog;
  const tCart = translations[lang].cart;
  const router = useRouter();
  const { addItem } = useCart();
  const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
  const href = `/${lang}/catalog/${product.slug}`;
  const finalPrice = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);
  const isPlushyToys = product.catalogKind === 'plushyToy';
  const sizeLabel = (product.sizeLabel || '').trim();

  const images = useMemo(() => {
    const raw = product.images ?? [];
    return raw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  }, [product.images]);

  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => {
    setImageIndex(0);
  }, [product.id]);

  const imgSrc = isPlushyToys
    ? (images[imageIndex] ?? images[0] ?? '')
    : (product.images?.[0] ?? '');
  const isDataUrl = typeof imgSrc === 'string' && imgSrc.startsWith('data:');
  const canSwipePlushyImages = isPlushyToys && images.length > 1;

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
      if (touchStartX.current == null || !canSwipePlushyImages) {
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
    [canSwipePlushyImages, goNextImage, goPrevImage]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!canSwipePlushyImages) return;
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
    [canSwipePlushyImages, goNextImage, goPrevImage]
  );

  useEffect(() => {
    return () => {
      if (mouseUpListenerRef.current) {
        window.removeEventListener('mouseup', mouseUpListenerRef.current);
        mouseUpListenerRef.current = null;
      }
    };
  }, []);

  const options = useMemo(
    () =>
      buildSyntheticOptions(finalPrice, {
        elegant: t.productCardOptionElegant,
        compact: t.productCardOptionCompact,
        standard: t.productCardOptionStandard,
        business: t.productCardOptionBusiness,
      }),
    [finalPrice, t]
  );

  const [hovered, setHovered] = useState(false);
  const [selectedId, setSelectedId] = useState('business');
  const [justAdded, setJustAdded] = useState(false);

  const selected = options.find((o) => o.id === selectedId && o.available) ?? options.filter((o) => o.available).pop();

  const handleLinkClick = () => {
    const item: AnalyticsItem = {
      item_id: product.id,
      item_name: name,
      item_category: getProductDisplayCategory(product),
      price: finalPrice,
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
      if (isPlushyToys) {
        addItem(
          {
            itemType: 'plushyToy',
            bouquetId: product.id,
            slug: product.slug,
            nameEn: product.nameEn,
            nameTh: product.nameTh ?? product.nameEn,
            imageUrl: imgSrc || undefined,
            size: {
              optionId: 'product_default',
              key: 'm',
              label: sizeLabel || '—',
              price: finalPrice,
              description: '',
            },
            addOns: getDefaultAddOns(),
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
              item_variant: sizeLabel || undefined,
            },
          ],
        });
        if (mode === 'stay') {
          setJustAdded(true);
          window.setTimeout(() => setJustAdded(false), 6000);
        } else {
          router.push(`/${lang}/cart`);
        }
        return;
      }
      if (!selected) return;
      addItem(
        {
          itemType: 'product',
          bouquetId: product.id,
          slug: product.slug,
          nameEn: product.nameEn,
          nameTh: product.nameTh ?? product.nameEn,
          imageUrl: imgSrc || undefined,
          size: {
            optionId: `product_${product.id}_${selected.id}`,
            key: selected.sizeKey,
            label: selected.label,
            price: selected.price,
            description: '',
          },
          addOns: getDefaultAddOns(),
        },
        1
      );
      trackAddToCart({
        currency: 'THB',
        value: selected.price,
        items: [
          {
            item_id: product.id,
            item_name: name,
            price: selected.price,
            quantity: 1,
            index: 0,
            item_category: getProductDisplayCategory(product),
            item_variant: selected.label,
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
    [addItem, finalPrice, imgSrc, isPlushyToys, lang, name, product, router, selected, sizeLabel]
  );

  const radioName = `product-opt-${product.id}`;

  return (
    <article
      className="pcard"
      data-expanded={hovered ? 'true' : 'false'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={href}
        className="pcard-link"
        data-ga-select-item="catalog"
        onClick={handleLinkClickGuarded}
        aria-label={`${name} — ${t.from} ฿${finalPrice.toLocaleString()}`}
      >
        <div
          className="pcard-image-wrap"
          style={canSwipePlushyImages ? { touchAction: 'pan-y' as const } : undefined}
          onTouchStart={canSwipePlushyImages ? handleTouchStart : undefined}
          onTouchEnd={canSwipePlushyImages ? handleTouchEnd : undefined}
          onMouseDown={canSwipePlushyImages ? handleMouseDown : undefined}
          aria-label={canSwipePlushyImages ? (lang === 'th' ? 'เลื่อนเพื่อดูรูปเพิ่ม' : 'Swipe to see more images') : undefined}
        >
          {product.isHit ? <span className="pcard-hit">{t.hitBadge}</span> : null}
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
                alt={name}
                width={400}
                height={400}
                className="pcard-image"
                sizes="(max-width: 600px) 50vw, (max-width: 900px) 50vw, 33vw"
                unoptimized={isDataUrl}
                draggable={false}
                style={{ pointerEvents: 'none' }}
              />
            </div>
          ) : (
            <div className="pcard-image pcard-image-placeholder" aria-hidden />
          )}
          {canSwipePlushyImages ? (
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
            <span className="pcard-price-from">{t.from}</span>{' '}
            <span className="pcard-price-amount">฿{finalPrice.toLocaleString()}</span>
          </div>
          {isPlushyToys && sizeLabel ? <div className="pcard-size">Size: {sizeLabel}</div> : null}
        </div>
      </Link>

      <div
        className="pcard-panel"
        aria-hidden={!hovered}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="pcard-panel-inner">
          {isPlushyToys ? null : (
            <>
              <p className="pcard-options-title">{t.productCardOptions}</p>
              <ul className="pcard-option-list" role="list">
                {options.map((row) => {
                  if (!row.available) {
                    return (
                      <li key={row.id} className="pcard-option pcard-option--disabled">
                        <span className="pcard-option-label">
                          <input type="radio" disabled className="pcard-radio" />
                          <span>{row.label}</span>
                        </span>
                        <span className="pcard-option-right">{t.productCardNotAvailable}</span>
                      </li>
                    );
                  }
                  const isChecked = selectedId === row.id;
                  return (
                    <li key={row.id} className="pcard-option">
                      <label className="pcard-option-label">
                        <input
                          type="radio"
                          className="pcard-radio"
                          name={radioName}
                          checked={isChecked}
                          onChange={() => setSelectedId(row.id)}
                        />
                        <span className="pcard-label-text">
                          {row.label}
                          {isChecked ? (
                            <span className="pcard-check" aria-hidden>
                              {' '}
                              ✓
                            </span>
                          ) : null}
                        </span>
                      </label>
                      <span className="pcard-option-price">฿{row.price.toLocaleString()}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {justAdded ? (
            <>
              <p className="pcard-added" role="status">
                {tCart.addedToCart}
              </p>
              <button
                type="button"
                className={`pcard-btn-cart ${isPlushyToys ? 'pcard-btn-cart--plushy' : ''}`}
                onClick={() => router.push(`/${lang}/cart`)}
              >
                {tCart.goToCart}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`pcard-btn-cart ${isPlushyToys ? 'pcard-btn-cart--plushy' : ''}`}
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
          z-index: 30;
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
        }
        .pcard[data-expanded='true'] .pcard-panel {
          max-height: 320px;
          pointer-events: auto;
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
      `}</style>
    </article>
  );
}
