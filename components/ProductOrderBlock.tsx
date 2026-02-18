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
import { trackAddToCart } from '@/lib/analytics';
import { TrustBadges } from '@/components/TrustBadges';

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

export function ProductOrderBlock({
  bouquet,
  lang,
  selectedImageUrl,
}: {
  bouquet: Bouquet;
  lang: Locale;
  selectedImageUrl?: string | null;
}) {
  const [selectedSize, setSelectedSize] = useState<BouquetSize>(bouquet.sizes[0]);
  const [addOns, setAddOns] = useState<AddOnsValues>(getDefaultAddOns);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCart();
  const t = translations[lang].cart;
  const tBuyNow = translations[lang].buyNow;

  const handleAddToCart = () => {
    const itemName = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
    const price = selectedSize.price;
    addItem({
      bouquetId: bouquet.id,
      slug: bouquet.slug,
      nameEn: bouquet.nameEn,
      nameTh: bouquet.nameTh,
      imageUrl: selectedImageUrl ?? bouquet.images?.[0],
      size: selectedSize,
      addOns: { ...addOns },
    });
    trackAddToCart({
      currency: 'THB',
      value: price,
      items: [
        {
          item_id: bouquet.id,
          item_name: itemName,
          price,
          quantity: 1,
          index: 0,
          item_category: bouquet.category,
          item_variant: selectedSize.label,
        },
      ],
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
        <>
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
        @media (max-width: 480px) {
          .order-block-title {
            font-size: 1rem;
            margin-bottom: 12px;
          }
          .order-add-to-cart-btn {
            font-size: 0.95rem;
            padding: 12px 16px;
          }
          .order-added-links {
            flex-direction: column;
          }
          .order-added-links :global(a.order-added-link) {
            width: 100%;
          }
        }
        @media (max-width: 360px) {
          .order-block-title {
            font-size: 0.95rem;
          }
          .order-add-to-cart-btn {
            font-size: 0.9rem;
            padding: 10px 14px;
          }
        }
        @media (max-width: 350px) {
          .order-block-title {
            font-size: 0.9rem;
            margin-bottom: 10px;
          }
          .order-add-to-cart-btn {
            font-size: 0.85rem;
            padding: 10px 12px;
          }
          .order-added-confirm {
            padding: 12px;
          }
          .order-added-text {
            font-size: 0.9rem;
          }
          .order-added-links :global(a.order-added-link) {
            font-size: 0.9rem;
            padding: 12px 16px;
          }
          .order-addons-summary {
            padding: 8px 12px;
            font-size: 0.8rem;
          }
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
