'use client';

import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export type CardType = 'free' | 'beautiful' | null;
export type WrappingPreference = 'none' | 'classic' | 'premium' | null;

export interface AddOnsValues {
  cardType: CardType;
  cardMessage: string;
  wrappingPreference: WrappingPreference;
}

export const CARD_BEAUTIFUL_PRICE_THB = 20;
const CARD_MESSAGE_MAX = 250;

const defaultAddOns: AddOnsValues = {
  cardType: null,
  cardMessage: '',
  wrappingPreference: null,
};

export function getDefaultAddOns(): AddOnsValues {
  return { ...defaultAddOns };
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
  const t = translations[lang].buyNow;
  const cardMessageMax = typeof t.cardMessageMax === 'number' ? t.cardMessageMax : CARD_MESSAGE_MAX;

  return (
    <div className="addons-section">
      <div className="addons-field">
        <label className="addons-label" htmlFor="addons-card-message">
          {t.cardMessageLabel}
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
