'use client';

import {
  CHECKOUT_FIELD_LIMITS,
  GIFT_CARD_MESSAGES_MAX_COUNT,
  clipCheckoutField,
} from '@/lib/checkout/checkoutFieldLimits';
import { translations, type Locale } from '@/lib/i18n';

type GiftCardMessagesEditorProps = {
  lang: Locale;
  messages: string[];
  onChangeAt: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  /** Optional class for each textarea */
  textareaClassName?: string;
  /** When true, show suggestion chips only under the first field (caller renders chips). */
  hideLabels?: boolean;
  idPrefix?: string;
  onFocusFirst?: () => void;
  onBlurFirst?: () => void;
};

export function GiftCardMessagesEditor({
  lang,
  messages,
  onChangeAt,
  onAdd,
  onRemove,
  disabled = false,
  textareaClassName = 'addons-textarea',
  hideLabels = false,
  idPrefix = 'gift-card',
  onFocusFirst,
  onBlurFirst,
}: GiftCardMessagesEditorProps) {
  const tBuy = translations[lang].buyNow as {
    cardMessagePlaceholder?: string;
    cardMessageMax?: number;
    addAnotherCard?: string;
    removeCard?: string;
    cardNLabel?: string;
  };
  const tCheckout = translations[lang].premiumCheckout as {
    giftMessagePlaceholder?: string;
    addAnotherCard?: string;
    removeCard?: string;
    cardNLabel?: string;
  };

  const maxLen =
    typeof tBuy.cardMessageMax === 'number'
      ? Math.min(tBuy.cardMessageMax, CHECKOUT_FIELD_LIMITS.giftCardMessage)
      : CHECKOUT_FIELD_LIMITS.giftCardMessage;
  const placeholder =
    tCheckout.giftMessagePlaceholder ?? tBuy.cardMessagePlaceholder ?? '';
  const addLabel = tCheckout.addAnotherCard ?? tBuy.addAnotherCard ?? 'Add another card';
  const removeLabel = tCheckout.removeCard ?? tBuy.removeCard ?? 'Remove';
  const cardNLabel = tCheckout.cardNLabel ?? tBuy.cardNLabel ?? 'Card {n}';
  const canAdd = !disabled && messages.length < GIFT_CARD_MESSAGES_MAX_COUNT;

  return (
    <div className="gift-card-messages-editor">
      {messages.map((value, index) => {
        const label = cardNLabel.replace('{n}', String(index + 1));
        const fieldId = `${idPrefix}-${index}`;
        return (
          <div
            key={fieldId}
            className="gift-card-messages-editor__slot"
            style={{ marginBottom: index < messages.length - 1 || canAdd ? 12 : 0 }}
          >
            {!hideLabels && messages.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <label
                  htmlFor={fieldId}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                  }}
                >
                  {label}
                </label>
                {index > 0 && !disabled && (
                  <button
                    type="button"
                    className="co-clear-btn"
                    onClick={() => onRemove(index)}
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                  >
                    {removeLabel}
                  </button>
                )}
              </div>
            )}
            {hideLabels && index > 0 && !disabled && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: 4,
                }}
              >
                <button
                  type="button"
                  className="co-clear-btn"
                  onClick={() => onRemove(index)}
                  style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                >
                  {removeLabel}
                </button>
              </div>
            )}
            <textarea
              id={fieldId}
              className={textareaClassName}
              value={disabled ? '' : value}
              disabled={disabled}
              rows={3}
              maxLength={maxLen}
              placeholder={placeholder}
              aria-label={label}
              onChange={(e) =>
                onChangeAt(index, clipCheckoutField(e.target.value, 'giftCardMessage'))
              }
              onFocus={index === 0 ? onFocusFirst : undefined}
              onBlur={index === 0 ? onBlurFirst : undefined}
              style={
                textareaClassName === 'addons-textarea'
                  ? {
                      display: 'block',
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      color: 'var(--text)',
                      resize: 'vertical',
                      minHeight: 72,
                    }
                  : undefined
              }
            />
            <span
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: 4,
              }}
              aria-live="polite"
            >
              {(disabled ? '' : value).length}/{maxLen}
            </span>
          </div>
        );
      })}
      {canAdd && (
        <button
          type="button"
          className="co-clear-btn"
          onClick={onAdd}
          style={{
            marginTop: 4,
            fontSize: '0.8rem',
            fontWeight: 600,
            textDecoration: 'underline',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          + {addLabel}
        </button>
      )}
    </div>
  );
}
