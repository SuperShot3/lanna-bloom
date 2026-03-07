'use client';

import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import {
  ADDONS,
  getAddOnsTotal,
  type ProductAddOnsSelected,
} from '@/lib/addonsConfig';

export type CardType = 'free' | 'beautiful' | null;
export type WrappingPreference = 'none' | 'classic' | 'premium' | null;

export interface AddOnsValues {
  cardType: CardType;
  cardMessage: string;
  wrappingPreference: WrappingPreference;
  /** Product add-ons: Chocolates, Vase, Teddy Bear */
  productAddOns?: ProductAddOnsSelected;
}

export const CARD_BEAUTIFUL_PRICE_THB = 20;
const CARD_MESSAGE_MAX = 250;

const defaultAddOns: AddOnsValues = {
  cardType: null,
  cardMessage: '',
  wrappingPreference: null,
  productAddOns: {},
};

export function getDefaultAddOns(): AddOnsValues {
  return { ...defaultAddOns, productAddOns: {} };
}

export function AddOnsSection({
  lang,
  value,
  onChange,
}: {
  lang: Locale;
  value: AddOnsValues;
  onChange: (v: AddOnsValues) => void;
}) {
  const tRaw = translations[lang].buyNow;
  const t = tRaw as {
    giftMessageLabel?: string;
    cardMessageLabel?: string;
    cardMessagePlaceholder?: string;
    cardMessageMax?: number;
  };
  const cardMessageMax = typeof t.cardMessageMax === 'number' ? t.cardMessageMax : CARD_MESSAGE_MAX;
  const productAddOns = value.productAddOns ?? {};

  const toggleProductAddOn = (id: keyof ProductAddOnsSelected) => {
    onChange({
      ...value,
      productAddOns: {
        ...productAddOns,
        [id]: !productAddOns[id],
      },
    });
  };

  return (
    <div className="addons-section">
      <div className="addons-product-grid">
        {ADDONS.map((addon) => {
          const name = lang === 'th' ? addon.nameTh : addon.nameEn;
          const isSelected = !!productAddOns[addon.id];
          return (
            <button
              key={addon.id}
              type="button"
              className={`addons-product-card ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleProductAddOn(addon.id)}
            >
              {isSelected && (
                <span className="addons-product-check material-symbols-outlined">check</span>
              )}
              <div className="addons-product-icon" />
              <p className="addons-product-name">{name}</p>
              <p className="addons-product-price">+ ฿{addon.price.toLocaleString()}</p>
            </button>
          );
        })}
      </div>
      <div className="addons-field">
        <label className="addons-label" htmlFor="addons-card-message">
          {t.giftMessageLabel ?? t.cardMessageLabel ?? 'Gift Message'}
        </label>
        <textarea
          id="addons-card-message"
          className="addons-textarea"
          value={value.cardMessage}
          onChange={(e) =>
            onChange({
              ...value,
              cardMessage: e.target.value.slice(0, cardMessageMax),
            })
          }
          placeholder={t.cardMessagePlaceholder}
          maxLength={cardMessageMax}
          rows={3}
          aria-label={t.cardMessageLabel}
        />
        <span className="addons-char-count" aria-live="polite">
          {value.cardMessage.length}/{cardMessageMax}
        </span>
      </div>
      <style jsx>{`
        .addons-section {
          margin-top: 16px;
        }
        .addons-product-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .addons-product-card {
          position: relative;
          padding: 12px;
          border: 2px solid var(--border);
          border-radius: 12px;
          background: var(--surface);
          cursor: pointer;
          text-align: center;
          transition: border-color 0.2s, background 0.2s;
        }
        .addons-product-card:hover {
          border-color: #1a3c34;
          background: rgba(26, 60, 52, 0.05);
        }
        .addons-product-card.selected {
          border-color: #1a3c34;
          background: rgba(26, 60, 52, 0.08);
        }
        .addons-product-check {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 18px;
          height: 18px;
          font-size: 14px;
          color: white;
          background: #1a3c34;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .addons-product-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 8px;
          background: var(--pastel-cream);
          border-radius: 8px;
        }
        .addons-product-name {
          font-size: 12px;
          font-weight: 600;
          margin: 0 0 4px;
          color: var(--text);
        }
        .addons-product-price {
          font-size: 10px;
          color: #c5a059;
          margin: 0;
        }
        .addons-field {
          margin-bottom: 0;
        }
        .addons-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .addons-textarea {
          display: block;
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          font-family: inherit;
          color: var(--text);
          resize: vertical;
          min-height: 72px;
        }
        .addons-textarea:focus {
          outline: none;
          border-color: var(--accent);
        }
        .addons-textarea::placeholder {
          color: var(--text-muted);
          opacity: 0.4;
        }
        .addons-char-count {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
