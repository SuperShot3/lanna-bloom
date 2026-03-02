'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getDefaultAddOns } from './AddOnsSection';
import { useCart } from '@/contexts/CartContext';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { trackAddToCart } from '@/lib/analytics';
import { TrustBadges } from '@/components/TrustBadges';
import type { CatalogProduct } from '@/lib/sanity';
import { computeFinalPrice } from '@/lib/partnerPricing';

export function ProductOrderBlockForProduct({
  product,
  lang,
  selectedImageUrl,
}: {
  product: CatalogProduct;
  lang: Locale;
  selectedImageUrl?: string | null;
}) {
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCart();
  const t = translations[lang].cart;
  const tBuyNow = translations[lang].buyNow;
  const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
  const finalPrice = computeFinalPrice(product.price, product.commissionPercent);

  const handleAddToCart = () => {
    const qty = Math.max(1, Math.floor(quantity));
    const syntheticSize = {
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
        imageUrl: selectedImageUrl ?? product.images?.[0],
        size: syntheticSize,
        addOns: getDefaultAddOns(),
      },
      qty
    );
    trackAddToCart({
      currency: 'THB',
      value: finalPrice * qty,
      items: [
        {
          item_id: product.id,
          item_name: name,
          price: finalPrice,
          quantity: qty,
          index: 0,
          item_category: product.category,
        },
      ],
    });
    setJustAdded(true);
  };

  return (
    <div className="order-block">
      <h2 className="order-block-title">{tBuyNow.title}</h2>
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
            <span className="order-qty-price">฿{(finalPrice * quantity).toLocaleString()}</span>
          </div>
          <TrustBadges lang={lang} />
          <button
            type="button"
            className="order-add-to-cart-btn"
            onClick={handleAddToCart}
          >
            {t.addToCart}
          </button>
        </>
      )}
      <style jsx>{`
        .order-block-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 16px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .order-qty-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
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
