'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CatalogProduct } from '@/lib/sanity';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { trackSelectItem, trackAddToCart } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';
import { computeFinalPrice } from '@/lib/partnerPricing';
import type { SizeKey } from '@/lib/bouquets';
import { useCart } from '@/contexts/CartContext';
import { getDefaultAddOns } from '@/components/AddOnsSection';

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
  const imgSrc = product.images?.[0] ?? '';
  const isDataUrl = typeof imgSrc === 'string' && imgSrc.startsWith('data:');
  const finalPrice = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);

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
      item_category: product.category,
      price: finalPrice,
      quantity: 1,
      index: 0,
    };
    trackSelectItem('catalog', item);
  };

  const pushToCart = useCallback(
    (mode: 'stay' | 'checkout') => {
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
            item_category: product.category,
            item_variant: selected.label,
          },
        ],
      });
      if (mode === 'stay') {
        setJustAdded(true);
        window.setTimeout(() => setJustAdded(false), 2200);
      } else {
        router.push(`/${lang}/cart`);
      }
    },
    [addItem, imgSrc, lang, name, product, router, selected]
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
        onClick={handleLinkClick}
        aria-label={`${name} — ${t.from} ฿${finalPrice.toLocaleString()}`}
      >
        <div className="pcard-image-wrap">
          {product.isHit ? <span className="pcard-hit">{t.hitBadge}</span> : null}
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
        </div>
        <div className="pcard-body">
          <div className="pcard-name" title={name}>
            {name}
          </div>
          <div className="pcard-price">
            {t.from} ฿{finalPrice.toLocaleString()}
          </div>
        </div>
      </Link>

      <div
        className="pcard-panel"
        aria-hidden={!hovered}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="pcard-panel-inner">
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

          {justAdded ? (
            <p className="pcard-added" role="status">
              {tCart.addedToCart}
            </p>
          ) : (
            <>
              <button type="button" className="pcard-btn-cart" onClick={() => pushToCart('stay')}>
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
          font-size: 0.95rem;
          color: var(--text-muted);
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
          transition: background 0.2s, transform 0.15s;
        }
        .pcard-btn-cart:hover {
          background: #dceee4;
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
