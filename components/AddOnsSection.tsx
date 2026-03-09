'use client';

import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { GiftsCarousel } from '@/components/GiftsCarousel';
import type { CatalogProduct } from '@/lib/sanity';

export type CardType = 'free' | 'beautiful' | null;
export type WrappingPreference = 'none' | 'classic' | 'premium' | null;

export interface AddOnsValues {
  cardType: CardType;
  cardMessage: string;
  wrappingPreference: WrappingPreference;
  /** Product add-ons (legacy) — kept for cart/order compatibility */
  productAddOns?: Record<string, boolean>;
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
  gifts = [],
}: {
  lang: Locale;
  value: AddOnsValues;
  onChange: (v: AddOnsValues) => void;
  /** Gift products from catalog (category=gifts) to display in "You might be interested" carousel */
  gifts?: CatalogProduct[];
}) {
  const tRaw = translations[lang].buyNow;
  const t = tRaw as {
    giftMessageLabel?: string;
    cardMessageLabel?: string;
    cardMessagePlaceholder?: string;
    cardMessageMax?: number;
    giftsSectionTitle?: string;
  };
  const cardMessageMax = typeof t.cardMessageMax === 'number' ? t.cardMessageMax : CARD_MESSAGE_MAX;

  return (
    <div className="addons-section">
      {gifts.length > 0 && (
        <>
          <h3 className="addons-gifts-heading">
            {t.giftsSectionTitle ?? 'You might be interested as well'}
          </h3>
          <GiftsCarousel gifts={gifts} lang={lang} />
        </>
      )}
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
        .addons-gifts-heading {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 12px;
          line-height: 1.3;
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
