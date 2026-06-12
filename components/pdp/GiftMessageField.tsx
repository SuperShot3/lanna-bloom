'use client';

import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import {
  CHECKOUT_FIELD_LIMITS,
  clipCheckoutField,
} from '@/lib/checkout/checkoutFieldLimits';
import styles from './product-pdp.module.css';

export function GiftMessageField({
  lang,
  value,
  onChange,
  embedded = false,
}: {
  lang: Locale;
  value: string;
  onChange: (message: string) => void;
  /** Use inside AddOnsSection (no collapsible row padding) */
  embedded?: boolean;
}) {
  const tRaw = translations[lang].buyNow;
  const t = tRaw as {
    giftMessageLabel?: string;
    cardMessageLabel?: string;
    cardMessagePlaceholder?: string;
    cardMessageMax?: number;
  };
  const cardMessageMax =
    typeof t.cardMessageMax === 'number'
      ? Math.min(t.cardMessageMax, CHECKOUT_FIELD_LIMITS.giftCardMessage)
      : CHECKOUT_FIELD_LIMITS.giftCardMessage;
  const label = t.giftMessageLabel ?? t.cardMessageLabel ?? 'Gift Message';

  const body = (
    <>
      <label className="addons-label" htmlFor="pdp-gift-message" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
        {label}
      </label>
      <textarea
        id="pdp-gift-message"
        className="addons-textarea"
        value={value}
        onChange={(e) => onChange(clipCheckoutField(e.target.value, 'giftCardMessage'))}
        placeholder={t.cardMessagePlaceholder}
        maxLength={cardMessageMax}
        rows={3}
        aria-label={label}
        style={{
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
        }}
      />
      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }} aria-live="polite">
        {value.length}/{cardMessageMax}
      </span>
    </>
  );

  if (embedded) return body;
  return <div className={styles.giftRowBody}>{body}</div>;
}
