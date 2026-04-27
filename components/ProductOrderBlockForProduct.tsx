'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AddOnsSection,
  getDefaultAddOns,
  type AddOnsValues,
} from './AddOnsSection';
import { getAddOnsTotal } from '@/lib/addonsConfig';
import { useCart } from '@/contexts/CartContext';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { trackAddToCart } from '@/lib/analytics';
import { TrustBadges } from '@/components/TrustBadges';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogProduct } from '@/lib/sanity';
import { computeFinalPrice } from '@/lib/partnerPricing';
import { getProductDisplayCategory } from '@/lib/catalogCategories';
import { BALLOON_TEXT_MAX_LENGTH, normalizeBalloonText } from '@/lib/balloonCustomization';

export function ProductOrderBlockForProduct({
  product,
  lang,
  selectedImageUrl,
  gifts = [],
  suggestedBouquets = [],
  description,
}: {
  product: CatalogProduct;
  lang: Locale;
  selectedImageUrl?: string | null;
  gifts?: CatalogProduct[];
  /** Bouquet cross-sell (e.g. on plushy toy PDP — pair with flowers) */
  suggestedBouquets?: Bouquet[];
  description?: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [addOns, setAddOns] = useState<AddOnsValues>(getDefaultAddOns);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCart();
  const t = translations[lang].cart;
  const tBuyNow = translations[lang].buyNow;
  const tBalloon = tBuyNow as typeof tBuyNow & {
    balloonTextTitle?: string;
    balloonTextIntro?: string;
    balloonTextLabel?: string;
    balloonTextPlaceholder?: string;
    balloonTextHelper?: string;
  };
  const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
  const finalPrice = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);
  const addOnsTotal = getAddOnsTotal(addOns.productAddOns ?? {});
  const totalPrice = (finalPrice + addOnsTotal) * Math.max(1, Math.floor(quantity));
  const itemType =
    product.catalogKind === 'plushyToy' ? 'plushyToy' : product.catalogKind === 'balloon' ? 'balloon' : 'product';
  const isBalloon = itemType === 'balloon';

  const sizeLabel = (product.sizeLabel || '').trim();

  const handleAddToCart = () => {
    const qty = Math.max(1, Math.floor(quantity));
    const syntheticSize = {
      optionId: 'product_default',
      key: 'm' as const,
      label: sizeLabel || '—',
      // IMPORTANT: Cart totals add add-ons separately, so keep base price here.
      price: finalPrice,
      description: '',
      preparationTime: undefined as number | undefined,
      availability: true,
    };
    const balloonText = isBalloon ? normalizeBalloonText(addOns.balloonText) : undefined;
    addItem(
      {
        itemType,
        bouquetId: product.id,
        slug: product.slug,
        nameEn: product.nameEn,
        nameTh: product.nameTh ?? product.nameEn,
        imageUrl: selectedImageUrl ?? product.images?.[0],
        size: syntheticSize,
        addOns: { ...addOns, balloonText },
      },
      qty
    );
    trackAddToCart({
      currency: 'THB',
      value: totalPrice,
      items: [
        {
          item_id: product.id,
          item_name: name,
          price: finalPrice,
          quantity: qty,
          index: 0,
          item_category: getProductDisplayCategory(product),
        },
      ],
    });
    setJustAdded(true);
  };

  return (
    <div className="order-block">
      <h2 className="order-block-title">{tBuyNow.title}</h2>
      {sizeLabel ? <p className="order-size">Size: {sizeLabel}</p> : null}
      {justAdded ? (
        <div className="order-added-confirm" role="status">
          <p className="order-added-text">{t.addedToCart}</p>
          <div className="order-added-links">
            <Link href={`/${lang}/catalog`} className="order-added-link">
              {t.continueShopping}
            </Link>
            <Link href={`/${lang}/cart`} className="order-added-link order-added-link-primary">
              {t.goToCart}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {!isBalloon && (
            <AddOnsSection
              lang={lang}
              value={addOns}
              onChange={setAddOns}
              gifts={gifts.filter((g) => g.id !== product.id)}
              suggestedBouquets={suggestedBouquets}
            />
          )}
          {isBalloon && (
            <div className="balloon-customization">
              <h3 className="balloon-customization-title">
                {tBalloon.balloonTextTitle ?? 'Custom balloon text'}
              </h3>
              <p className="balloon-customization-intro">
                {tBalloon.balloonTextIntro ??
                  'We can add short custom text to this balloon. The shop will use this exact text when preparing your order.'}
              </p>
              <label className="balloon-customization-label" htmlFor="balloon-custom-text">
                {tBalloon.balloonTextLabel ?? 'Text for balloon'}
              </label>
              <textarea
                id="balloon-custom-text"
                className="balloon-customization-textarea"
                value={addOns.balloonText ?? ''}
                onChange={(e) =>
                  setAddOns((current) => ({
                    ...current,
                    balloonText: e.target.value.slice(0, BALLOON_TEXT_MAX_LENGTH),
                  }))
                }
                placeholder={tBalloon.balloonTextPlaceholder ?? 'Happy Birthday Anna'}
                maxLength={BALLOON_TEXT_MAX_LENGTH}
                rows={2}
              />
              <div className="balloon-customization-footer">
                <span>
                  {tBalloon.balloonTextHelper ??
                    'Short text works best. Final placement depends on balloon shape and available space.'}
                </span>
                <span aria-live="polite">
                  {(addOns.balloonText ?? '').length}/{BALLOON_TEXT_MAX_LENGTH}
                </span>
              </div>
            </div>
          )}
          {isBalloon && description ? (
            <div className="balloon-product-description">
              <h2 className="product-section-heading">{translations[lang].product.descriptionHeading}</h2>
              <p className="product-desc">{description}</p>
            </div>
          ) : null}
          <div className="order-qty-row">
            <span className="order-qty-label">{tBuyNow.quantity ?? 'Quantity'}</span>
            <div className="order-qty-control">
              <button
                type="button"
                className="order-qty-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="order-qty-value">{quantity}</span>
              <button
                type="button"
                className="order-qty-btn"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <span className="order-qty-price">฿{totalPrice.toLocaleString()}</span>
          </div>
          <TrustBadges lang={lang} />
          <button
            type="button"
            className="order-add-to-cart-btn"
            onClick={handleAddToCart}
          >
            {t.addToCart} — ฿{totalPrice.toLocaleString()}
          </button>
        </>
      )}
      <style jsx>{`
        .order-block {
          position: relative;
        }
        .order-block-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 16px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .order-size {
          margin: -6px 0 14px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .order-qty-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .balloon-customization {
          margin-top: 16px;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--pastel-cream, #fdf8f3);
        }
        .balloon-customization-title {
          margin: 0 0 6px;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
        }
        .balloon-customization-intro {
          margin: 0 0 12px;
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .balloon-customization-label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .balloon-customization-textarea {
          display: block;
          width: 100%;
          min-height: 64px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font: inherit;
          color: var(--text);
          resize: vertical;
          background: #fff;
        }
        .balloon-customization-textarea:focus {
          outline: none;
          border-color: var(--accent);
        }
        .balloon-customization-footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-top: 6px;
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .balloon-product-description {
          margin-top: 16px;
        }
        .order-qty-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .order-qty-control {
          display: flex;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .order-qty-btn {
          width: 40px;
          height: 40px;
          padding: 0;
          border: none;
          background: var(--surface);
          color: var(--text);
          font-size: 1.2rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .order-qty-btn:hover {
          background: var(--pastel-cream);
        }
        .order-qty-value {
          width: 44px;
          text-align: center;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .order-qty-price {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--accent);
        }
        .order-add-to-cart-btn {
          margin-top: 16px;
          width: 100%;
          padding: 14px 20px;
          background: var(--accent);
          border: none;
          border-radius: var(--radius-sm);
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .order-add-to-cart-btn:hover {
          background: #b39868;
          transform: translateY(-1px);
        }
        .order-add-to-cart-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .order-added-confirm {
          margin-top: 20px;
          padding: 16px;
          background: var(--pastel-cream, #fdf8f3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .order-added-text {
          margin: 0 0 12px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
        }
        .order-added-links {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .order-added-links :global(a.order-added-link) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 20px;
          border-radius: var(--radius-sm);
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          background: var(--accent);
          border: none;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .order-added-links :global(a.order-added-link:hover) {
          background: #b39868;
          color: #fff;
          transform: translateY(-1px);
        }
        .order-added-links :global(a.order-added-link:focus-visible) {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .order-added-links :global(a.order-added-link:not(.order-added-link-primary)) {
          background: var(--pastel-cream, #e8e2da);
          color: var(--text);
          border: 2px solid var(--border);
        }
        .order-added-links :global(a.order-added-link:not(.order-added-link-primary):hover) {
          background: #ddd6cc;
          border-color: var(--text-muted);
          color: var(--text);
        }
        .order-added-links :global(a.order-added-link-primary) {
          background: var(--accent);
          color: #fff;
          border: none;
        }
        .order-added-links :global(a.order-added-link-primary:hover) {
          background: #b39868;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
