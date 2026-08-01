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
  /**
   * When false (PDP / single-item cart), only the first card field is shown
   * and “Add additional card” is hidden.
   */
  allowAdditional?: boolean;
  /** Flower / product names aligned with each card slot (cart unit order). */
  itemLabels?: string[];
  /** Optional class for each textarea */
  textareaClassName?: string;
  /** When true, suppress generic Card N labels (item labels still show when provided). */
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
  allowAdditional = false,
  itemLabels = [],
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
    cardForItemLabel?: string;
  };
  const tCheckout = translations[lang].premiumCheckout as {
    giftMessagePlaceholder?: string;
    addAnotherCard?: string;
    removeCard?: string;
    cardNLabel?: string;
    cardForItemLabel?: string;
  };

  const maxLen =
    typeof tBuy.cardMessageMax === 'number'
      ? Math.min(tBuy.cardMessageMax, CHECKOUT_FIELD_LIMITS.giftCardMessage)
      : CHECKOUT_FIELD_LIMITS.giftCardMessage;
  const placeholder =
    tCheckout.giftMessagePlaceholder ?? tBuy.cardMessagePlaceholder ?? '';
  const addLabel = tCheckout.addAnotherCard ?? tBuy.addAnotherCard ?? 'Add additional card';
  const removeLabel = tCheckout.removeCard ?? tBuy.removeCard ?? 'Remove';
  const cardNLabel = tCheckout.cardNLabel ?? tBuy.cardNLabel ?? 'Card {n}';
  const cardForItemLabel =
    tCheckout.cardForItemLabel ?? tBuy.cardForItemLabel ?? 'Card for {name}';
  const visibleMessages = allowAdditional ? messages : messages.slice(0, 1);
  const slots = visibleMessages.length > 0 ? visibleMessages : [''];
  const canAdd =
    allowAdditional &&
    !disabled &&
    slots.length < GIFT_CARD_MESSAGES_MAX_COUNT;
  const showTopBar = canAdd;

  return (
    <div className="gift-card-messages-editor">
      {showTopBar && (
        <div
          className="gift-card-messages-editor__top"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            marginBottom: 6,
            minHeight: 0,
          }}
        >
          <button
            type="button"
            className="co-clear-btn"
            onClick={onAdd}
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'underline',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--text-muted)',
              lineHeight: 1.2,
            }}
          >
            + {addLabel}
          </button>
        </div>
      )}
      {slots.map((value, index) => {
        const itemName = itemLabels[index]?.trim() || '';
        const fallbackLabel = cardNLabel.replace('{n}', String(index + 1));
        const label = itemName
          ? cardForItemLabel.replace('{name}', itemName)
          : fallbackLabel;
        const fieldId = `${idPrefix}-${index}`;
        const showSlotHeader =
          Boolean(itemName) ||
          (allowAdditional && slots.length > 1) ||
          (!hideLabels && slots.length > 1);
        return (
          <div
            key={fieldId}
            className="gift-card-messages-editor__slot"
            style={{ marginBottom: index < slots.length - 1 ? 8 : 0 }}
          >
            {showSlotHeader && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <label
                  htmlFor={fieldId}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={label}
                >
                  {label}
                </label>
                {index > 0 && !disabled && allowAdditional && (
                  <button
                    type="button"
                    className="co-clear-btn"
                    onClick={() => onRemove(index)}
                    style={{ fontSize: '0.75rem', padding: '2px 8px', flexShrink: 0 }}
                  >
                    {removeLabel}
                  </button>
                )}
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
    </div>
  );
}
