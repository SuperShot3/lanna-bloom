'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PrefetchLink } from '@/components/PrefetchLink';
import { Bouquet, type BouquetSize } from '@/lib/bouquets';
import { optionDisplayLabel } from '@/lib/bouquetOptions';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { trackSelectItem, trackAddToCart } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';
import { useCart } from '@/contexts/CartContext';
import { getDefaultAddOns } from '@/components/AddOnsSection';
import {
  addFavorite,
  isFavorite,
  removeFavorite,
  setPreferredBouquetSize,
  FAVORITES_STORAGE_KEY,
  type FavoriteItem,
} from '@/lib/favorites';

function defaultOptionIdForBouquet(bouquet: Bouquet): string {
  const sizes = bouquet.sizes ?? [];
  const available = sizes.filter((s) => s.availability !== false);
  const pool = available.length ? available : sizes;
  if (!pool.length) return sizes[0]?.optionId ?? 'default';
  return pool.reduce((best, s) => (s.price >= best.price ? s : best), pool[0]).optionId;
}

const SWIPE_THRESHOLD_PX = 50;

type BouquetCardVariant = 'default' | 'popular' | 'popular-compact';

export function BouquetCard({
  bouquet,
  lang,
  variant = 'default',
  alwaysShowActions = false,
  showFavoriteButton,
  showHoverPanel = true,
  showPartnerBadge = true,
  persistPreferredSizeOnClick = false,
}: {
  bouquet: Bouquet;
  lang: Locale;
  variant?: BouquetCardVariant;
  /**
   * When true, keep the CTA panel visible even on devices without hover.
   * Useful for the `/favorites` grid.
   */
  alwaysShowActions?: boolean;
  /** If omitted, defaults to showing the heart button only for `popular*` variants. */
  showFavoriteButton?: boolean;
  /** When false, hide the CTA/quick-add panel entirely (simple “catalog card” mode). */
  showHoverPanel?: boolean;
  /** When false, hide the “hand-crafted by …” badge area. */
  showPartnerBadge?: boolean;
  /** When true, store the selected size for this bouquet before navigation. */
  persistPreferredSizeOnClick?: boolean;
}) {
  const t = translations[lang].catalog;
  const tCart = translations[lang].cart;
  const router = useRouter();
  const { addItem } = useCart();
  const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
  const minPrice = bouquet.sizes?.length
    ? Math.min(...bouquet.sizes.map((s) => s.price))
    : 0;
  const href = `/${lang}/catalog/${bouquet.slug}`;
  const images = bouquet.images?.length ? bouquet.images : [];
  const [imageIndex, setImageIndex] = useState(0);
  const imgSrc = images[imageIndex] ?? images[0] ?? '';
  const isDataUrl = typeof imgSrc === 'string' && imgSrc.startsWith('data:');
  const isPopular = variant === 'popular' || variant === 'popular-compact';
  const canSwipe = images.length > 1 && !isPopular;
  const showPanel = showHoverPanel;

  const defaultOid = useMemo(() => defaultOptionIdForBouquet(bouquet), [bouquet]);
  const [hovered, setHovered] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string>(defaultOid);
  const [justAdded, setJustAdded] = useState(false);

  const [favoriteActive, setFavoriteActive] = useState(false);

  useEffect(() => {
    setSelectedOptionId(defaultOid);
  }, [defaultOid]);

  useEffect(() => {
    if (!showPanel) return;
    setHovered(alwaysShowActions);
  }, [alwaysShowActions, showPanel]);

  useEffect(() => {
    const sync = () => {
      setFavoriteActive(isFavorite(bouquet.id));
    };
    sync();
    window.addEventListener('favorites-updated', sync as EventListener);
    // Cross-tab sync for sessionStorage (where supported) + defensive re-sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key === FAVORITES_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('favorites-updated', sync as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [bouquet.id]);

  const selectedSize: BouquetSize | undefined =
    bouquet.sizes?.find((s) => s.optionId === selectedOptionId) ?? bouquet.sizes?.[0];

  const pushToCart = useCallback(
    (mode: 'stay' | 'checkout') => {
      if (!selectedSize || selectedSize.availability === false) return;
      const itemName = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
      addItem(
        {
          itemType: 'bouquet',
          bouquetId: bouquet.id,
          slug: bouquet.slug,
          nameEn: bouquet.nameEn,
          nameTh: bouquet.nameTh,
          imageUrl: imgSrc || bouquet.images?.[0],
          size: selectedSize,
          addOns: getDefaultAddOns(),
        },
        1
      );
      trackAddToCart({
        currency: 'THB',
        value: selectedSize.price,
        items: [
          {
            item_id: bouquet.id,
            item_name: itemName,
            price: selectedSize.price,
            quantity: 1,
            index: 0,
            item_category: bouquet.category,
            item_variant: selectedSize ? optionDisplayLabel(selectedSize, lang) : undefined,
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
    [addItem, bouquet, imgSrc, lang, router, selectedSize]
  );

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

      if (persistPreferredSizeOnClick && selectedSize) {
        setPreferredBouquetSize(bouquet.id, selectedSize.optionId);
      }

      const item: AnalyticsItem = {
        item_id: bouquet.id,
        item_name: name,
        item_category: bouquet.category,
        item_variant: bouquet.sizes?.[0] ? optionDisplayLabel(bouquet.sizes[0], lang) : undefined,
        price: minPrice,
        quantity: 1,
        index: 0,
      };
      trackSelectItem('catalog', item);
    },
    [bouquet.id, bouquet.category, bouquet.sizes, name, minPrice, persistPreferredSizeOnClick, selectedSize]
  );

  const viewTransitionName = `product-${bouquet.id}`;
  const isCompact = variant === 'popular-compact';

  const radioName = `bouquet-opt-${bouquet.id}`;

  const showFavorite = showFavoriteButton ?? (variant === 'popular' || variant === 'popular-compact');

  const toggleFavorite = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const selected = selectedSize;
      const option = selected
        ? ({
            optionId: selected.optionId,
            sizeKey: selected.key,
            sizeLabel: optionDisplayLabel(selected, lang),
            sizePrice: selected.price,
          } as const)
        : undefined;

      const fav: FavoriteItem = {
        id: bouquet.id,
        name: lang === 'th' ? bouquet.nameTh : bouquet.nameEn,
        nameEn: bouquet.nameEn,
        nameTh: bouquet.nameTh,
        price: minPrice,
        image: imgSrc || bouquet.images?.[0] || '',
        slug: bouquet.slug,
        url: `/${lang}/catalog/${bouquet.slug}`,
        options: option
          ? {
              optionId: option.optionId,
              sizeKey: option.sizeKey,
              sizeLabel: option.sizeLabel,
              sizePrice: option.sizePrice,
            }
          : undefined,
      };

      if (favoriteActive) {
        removeFavorite(bouquet.id);
        setFavoriteActive(false);
      } else {
        addFavorite(fav);
        setFavoriteActive(true);
      }
    },
    [bouquet, favoriteActive, imgSrc, lang, minPrice, selectedSize]
  );

  return (
    <article
      className={`${isPopular ? 'card card-popular' : 'card'} ${alwaysShowActions ? 'card--always-actions' : ''}`}
      data-expanded={showPanel && hovered ? 'true' : 'false'}
      onMouseEnter={() => {
        if (showPanel && !alwaysShowActions) setHovered(true);
      }}
      onMouseLeave={() => {
        if (showPanel && !alwaysShowActions) setHovered(false);
      }}
    >
      <PrefetchLink
        href={href}
        className="card-link"
        data-ga-select-item="catalog"
        onClick={handleLinkClick}
        aria-label={`${name} — from ฿${minPrice.toLocaleString()}`}
      >
        <div
          className={`card-image-wrap ${isPopular ? 'card-image-wrap-popular' : ''} ${isCompact ? 'card-image-wrap-compact' : ''}`}
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
          {showFavorite && (
            <button
              type="button"
              className={`card-favorite ${favoriteActive ? 'is-active' : ''}`}
              aria-label={favoriteActive ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={favoriteActive}
              onClick={toggleFavorite}
            >
              <span
                className={`material-symbols-outlined ${favoriteActive ? 'material-symbols-filled' : ''}`}
              >
                favorite
              </span>
            </button>
          )}
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
          {showPartnerBadge && (bouquet.partnerName || bouquet.partnerId) ? (
            <div className="card-partner-badge" aria-hidden={false}>
              {bouquet.partnerName
                ? `${t.handCraftedBy ?? 'Hand-crafted by'} ${bouquet.partnerName}`
                : t.handCraftedByPartner ?? 'Hand-crafted by local partner'}
            </div>
          ) : null}
          {isPopular && (
            <div className="card-stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="material-symbols-outlined material-symbols-filled"
                >
                  star
                </span>
              ))}
            </div>
          )}
          <div className="card-name" title={name}>
            {name}
          </div>
          <div className="card-price">
            {t.from} ฿{minPrice.toLocaleString()}
          </div>
        </div>
      </PrefetchLink>

      {showPanel && (
        <div
          className="card-hover-panel"
          aria-hidden={!hovered}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="card-hover-panel-inner">
            <p className="card-hover-options-title">{t.productCardOptions}</p>
            <ul className="card-hover-option-list" role="list">
              {(bouquet.sizes ?? []).map((s) => {
                const unavailable = s.availability === false;
                if (unavailable) {
                  return (
                    <li key={s.optionId} className="card-hover-option card-hover-option--disabled">
                      <span className="card-hover-option-label">
                        <input type="radio" disabled className="card-hover-radio" />
                        <span>{optionDisplayLabel(s, lang)}</span>
                      </span>
                      <span className="card-hover-option-right">{t.productCardNotAvailable}</span>
                    </li>
                  );
                }
                const isChecked = selectedOptionId === s.optionId;
                return (
                  <li key={s.optionId} className="card-hover-option">
                    <label className="card-hover-option-label">
                      <input
                        type="radio"
                        className="card-hover-radio"
                        name={radioName}
                        checked={isChecked}
                        onChange={() => setSelectedOptionId(s.optionId)}
                      />
                      <span className="card-hover-label-text">
                        {optionDisplayLabel(s, lang)}
                        {isChecked ? (
                          <span className="card-hover-check" aria-hidden>
                            {' '}
                            ✓
                          </span>
                        ) : null}
                      </span>
                    </label>
                    <span className="card-hover-option-price">฿{s.price.toLocaleString()}</span>
                  </li>
                );
              })}
            </ul>
            {justAdded ? (
              <>
                <p className="card-hover-added" role="status">
                  {tCart.addedToCart}
                </p>
                <button type="button" className="card-hover-btn-cart" onClick={() => router.push(`/${lang}/cart`)}>
                  {tCart.goToCart}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="card-hover-btn-cart" onClick={() => pushToCart('stay')}>
                  {tCart.addToCart}
                </button>
                <button type="button" className="card-hover-buy-1" onClick={() => pushToCart('checkout')}>
                  {t.buyInOneClick}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .card {
          position: relative;
          background: var(--surface);
          border-radius: var(--radius);
          overflow: visible;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          transition: box-shadow 0.2s ease, border-radius 0.2s ease;
          width: 100%;
          max-width: 100%;
          height: 100%;
          min-width: 0;
          z-index: 1;
        }
        /* One continuous frame: no bottom edge on the top block while the panel is open (avoids a double line). */
        .card[data-expanded='true'] {
          z-index: 30;
          box-shadow: var(--shadow-hover);
          border-bottom: none;
          border-radius: var(--radius) var(--radius) 0 0;
        }
        @media (hover: hover) {
          .card:hover {
            box-shadow: var(--shadow-hover);
          }
        }
        .card-link {
          display: flex;
          flex-direction: column;
          height: 100%;
          color: inherit;
          text-decoration: none;
          touch-action: manipulation; /* Removes 300ms tap delay on iOS, reduces click-after-swipe glitch */
          min-width: 0;
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
        .card-image-wrap-popular {
          aspect-ratio: 3/4;
        }
        .card-image-wrap-compact {
          aspect-ratio: 1;
        }
        .card-favorite {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.9);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #666;
          transition: transform 0.18s ease, color 0.18s ease, background-color 0.18s ease;
          z-index: 2;
        }
        .card-favorite.is-active {
          transform: scale(1.08);
          color: #e11d48;
          background-color: rgba(225, 29, 72, 0.12);
        }
        .card-favorite:hover {
          color: #c5a059;
        }
        .card-favorite.is-active:hover {
          color: #e11d48;
        }
        .card-stars {
          display: flex;
          gap: 2px;
          color: #c5a059;
          font-size: 14px;
          margin-bottom: 6px;
        }
        .card-stars .material-symbols-outlined {
          font-size: 14px;
        }
        .card-partner-badge {
          font-size: 11px;
          color: #1a3c34;
          margin-bottom: 4px;
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
          object-position: top center;
        }
        .card-image-placeholder {
          background: var(--pastel-cream);
          min-height: 100%;
        }
        .card-body {
          padding: 11px 12px 13px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          min-height: 92px;
          min-width: 0;
        }
        .card-name {
          font-family: var(--font-serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          opacity: 0.60;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 6px;
        }
        .card-price {
          font-size: 14px;
          font-weight: 650;
          opacity: 0.90;
          color: var(--text);
        }

        .card-hover-panel {
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
        .card[data-expanded='true'] .card-hover-panel {
          max-height: 380px;
          pointer-events: auto;
        }
        @media (hover: none) {
          .card-hover-panel {
            display: none;
          }
          .card--always-actions .card-hover-panel {
            display: block;
            pointer-events: auto;
          }
        }

        .card-hover-panel-inner {
          padding: 10px 14px 14px;
        }
        .card-hover-options-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          margin: 0 0 8px;
          letter-spacing: 0.02em;
        }
        .card-hover-option-list {
          list-style: none;
          margin: 0;
          padding: 0;
          max-height: 200px;
          overflow-y: auto;
        }
        .card-hover-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 4px 0;
          font-size: 12px;
          color: var(--text);
        }
        .card-hover-option--disabled {
          color: var(--text-muted);
          opacity: 0.75;
        }
        .card-hover-option-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          min-width: 0;
        }
        .card-hover-option--disabled .card-hover-option-label {
          cursor: not-allowed;
        }
        .card-hover-radio {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          margin: 0;
          accent-color: var(--primary);
        }
        .card-hover-check {
          color: var(--primary);
          font-weight: 700;
        }
        .card-hover-option-price {
          color: var(--text-muted);
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }
        .card-hover-option-right {
          font-size: 11px;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .card-hover-btn-cart {
          display: block;
          width: 100%;
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(197, 160, 89, 0.35);
          border-radius: var(--radius-sm);
          background: rgba(197, 160, 89, 0.15);
          color: #c5a059;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: background 0.2s;
        }
        .card-hover-btn-cart:hover {
          background: rgba(197, 160, 89, 0.28);
        }
        .card-hover-btn-cart:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .card-hover-buy-1 {
          display: block;
          width: 100%;
          margin-top: 8px;
          padding: 0;
          border: none;
          background: none;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: #c0392b;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
          font-family: inherit;
        }
        .card-hover-buy-1:hover {
          color: #96281b;
        }
        .card-hover-buy-1:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-radius: 4px;
        }
        .card-hover-added {
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
