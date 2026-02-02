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

  const setCardType = (cardType: CardType) => {
    onChange({
      ...value,
      cardType,
      cardMessage: cardType === null ? '' : value.cardMessage,
    });
  };

  const setWrappingPreference = (wrappingPreference: WrappingPreference) => {
    onChange({ ...value, wrappingPreference });
  };

  return (
    <div className="addons-section">
      <div className="addons-heading" id="addons-heading">
        {t.addOnsTitle}
      </div>
      <div
        id="addons-content"
        role="region"
        aria-labelledby="addons-heading"
        className="addons-content"
      >
        <div className="addons-inner">
          {/* Card type (single-select checkbox group) */}
          <div className="addons-field" role="group" aria-label={t.cardTypeLabel}>
            <span className="addons-label">{t.cardTypeLabel}</span>
            <div className="addons-checkbox-group">
              <label className="addons-checkbox-label">
                <input
                  type="checkbox"
                  className="addons-checkbox"
                  checked={value.cardType === 'free'}
                  onChange={() => setCardType(value.cardType === 'free' ? null : 'free')}
                  aria-label={t.cardFree}
                />
                <span>{t.cardFree}</span>
              </label>
              <label className="addons-checkbox-label">
                <input
                  type="checkbox"
                  className="addons-checkbox"
                  checked={value.cardType === 'beautiful'}
                  onChange={() => setCardType(value.cardType === 'beautiful' ? null : 'beautiful')}
                  aria-label={t.cardBeautiful}
                />
                <span>{t.cardBeautiful}</span>
              </label>
            </div>
          </div>

          {/* Card message (only when a card type is selected) */}
          {value.cardType !== null && (
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
          )}

          {/* Wrapping preference (single-select checkbox group) */}
          <div className="addons-field" role="group" aria-label={t.wrappingLabel}>
            <span className="addons-label">{t.wrappingLabel}</span>
            <div className="addons-checkbox-group">
              <label className="addons-checkbox-label">
                <input
                  type="checkbox"
                  className="addons-checkbox"
                  checked={value.wrappingPreference === 'none'}
                  onChange={() =>
                    setWrappingPreference(value.wrappingPreference === 'none' ? null : 'none')
                  }
                  aria-label={t.wrappingNone}
                />
                <span>{t.wrappingNone}</span>
              </label>
              <label className="addons-checkbox-label">
                <input
                  type="checkbox"
                  className="addons-checkbox"
                  checked={value.wrappingPreference === 'classic'}
                  onChange={() =>
                    setWrappingPreference(value.wrappingPreference === 'classic' ? null : 'classic')
                  }
                  aria-label={t.wrappingClassic}
                />
                <span>{t.wrappingClassic}</span>
              </label>
              <label className="addons-checkbox-label">
                <input
                  type="checkbox"
                  className="addons-checkbox"
                  checked={value.wrappingPreference === 'premium'}
                  onChange={() =>
                    setWrappingPreference(value.wrappingPreference === 'premium' ? null : 'premium')
                  }
                  aria-label={t.wrappingPremium}
                />
                <span>{t.wrappingPremium}</span>
              </label>
            </div>
            <p className="addons-note">{t.wrappingNote}</p>
          </div>
        </div>
      </div>
      <style jsx>{`
        .addons-section {
          margin-top: 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: var(--shadow);
        }
        .addons-heading {
          padding: 14px 18px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }
        .addons-content {
          overflow: visible;
        }
        .addons-inner {
          padding: 16px 18px;
        }
        .addons-field {
          margin-bottom: 16px;
        }
        .addons-field:last-child {
          margin-bottom: 0;
        }
        .addons-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .addons-checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .addons-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: var(--text);
          cursor: pointer;
        }
        .addons-checkbox {
          margin: 0;
          width: 18px;
          height: 18px;
          accent-color: var(--accent);
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
        .addons-note {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 8px 0 0;
        }
      `}</style>
    </div>
  );
}
