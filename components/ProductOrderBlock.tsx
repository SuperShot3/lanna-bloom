'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bouquet, BouquetSize } from '@/lib/bouquets';
import { SizeSelector } from './SizeSelector';
import {
  AddOnsSection,
  getDefaultAddOns,
  type AddOnsValues,
} from './AddOnsSection';
import { useCart } from '@/contexts/CartContext';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

function buildAddOnsSummary(addOns: AddOnsValues, lang: Locale): string {
  const t = translations[lang].buyNow;
  const lines: string[] = [];
  if (addOns.cardType === 'beautiful') {
    lines.push(t.addOnsSummaryCardBeautiful);
  } else if (addOns.cardType === 'free') {
    lines.push(t.addOnsSummaryCard.replace('{label}', t.cardFree));
  }
  if (addOns.wrappingPreference === 'classic') {
    lines.push(t.addOnsSummaryWrapping.replace('{label}', t.wrappingClassic));
  } else if (addOns.wrappingPreference === 'premium') {
    lines.push(t.addOnsSummaryWrapping.replace('{label}', t.wrappingPremium));
  } else if (addOns.wrappingPreference === 'none') {
    lines.push(t.addOnsSummaryWrapping.replace('{label}', t.wrappingNone));
  }
  if (addOns.cardMessage.trim()) {
    lines.push(t.addOnsSummaryMessage.replace('{text}', addOns.cardMessage.trim()));
  }
  return lines.join('. ');
}

export function ProductOrderBlock({ bouquet, lang }: { bouquet: Bouquet; lang: Locale }) {
  const [selectedSize, setSelectedSize] = useState<BouquetSize>(bouquet.sizes[0]);
  const [addOns, setAddOns] = useState<AddOnsValues>(getDefaultAddOns);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCart();
  const t = translations[lang].cart;
  const tBuyNow = translations[lang].buyNow;

  const handleAddToCart = () => {
    addItem({
      bouquetId: bouquet.id,
      slug: bouquet.slug,
      nameEn: bouquet.nameEn,
      nameTh: bouquet.nameTh,
      size: selectedSize,
      addOns: { ...addOns },
    });
    setJustAdded(true);
  };

  const hasAddOns = !!(
    addOns.cardType ||
    addOns.wrappingPreference ||
    addOns.cardMessage.trim()
  );
  const addOnsSummary = buildAddOnsSummary(addOns, lang);

  return (
    <div className="order-block">
      <h2 className="order-block-title">{tBuyNow.title}</h2>
      <SizeSelector
        sizes={bouquet.sizes}
        selected={selectedSize}
        onSelect={setSelectedSize}
        lang={lang}
      />
      <AddOnsSection lang={lang} value={addOns} onChange={setAddOns} />
      {hasAddOns && addOnsSummary && (
        <div className="order-addons-summary" role="status">
          <span className="order-addons-summary-label">{tBuyNow.addOnsSummaryLabel}</span>
          <span className="order-addons-summary-text">{addOnsSummary}</span>
        </div>
      )}
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
        <button
          type="button"
          className="order-add-to-cart-btn"
          onClick={handleAddToCart}
        >
          {t.addToCart}
        </button>
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
        .order-addons-summary {
          margin-top: 12px;
          padding: 10px 14px;
          background: var(--pastel-cream, #fdf8f3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          color: var(--text);
        }
        .order-addons-summary-label {
          font-weight: 600;
          color: var(--text-muted);
        }
        .order-addons-summary-text {
          color: var(--text);
        }
        .order-add-to-cart-btn {
          margin-top: 20px;
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
        .order-added-link {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent);
          text-decoration: underline;
        }
        .order-added-link:hover {
          color: #967a4d;
        }
        .order-added-link-primary {
          padding: 8px 16px;
          background: var(--accent);
          color: #fff;
          text-decoration: none;
          border-radius: var(--radius-sm);
        }
        .order-added-link-primary:hover {
          background: #b39868;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
