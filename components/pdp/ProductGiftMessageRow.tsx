'use client';

import { useEffect, useId, useState } from 'react';
import { translations, type Locale } from '@/lib/i18n';
import { GiftMessageField } from './GiftMessageField';
import { StorefrontIcon } from '@/components/icons';
import styles from './product-pdp.module.css';

export function ProductGiftMessageRow({
  lang,
  value,
  onChange,
}: {
  lang: Locale;
  value: string;
  onChange: (message: string) => void;
}) {
  const [open, setOpen] = useState(value.length > 0);
  const panelId = useId();
  const t = translations[lang].product;

  useEffect(() => {
    if (value.length > 0) setOpen(true);
  }, [value]);

  return (
    <div className={styles.giftRow}>
      <button
        type="button"
        className={styles.giftRowToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className={styles.giftRowToggleStart}>
          <span className={styles.giftRowIconWrap} aria-hidden>
            <StorefrontIcon name="sms" className={styles.giftRowIcon} size={20} />
          </span>
          <span>
            <span className={styles.giftRowToggleLabel}>
              {t.addFreeGiftMessage ?? 'Add a gift message'}
            </span>
            {' '}
            <span className={styles.giftRowOptional}>({t.optional ?? 'Optional'})</span>
          </span>
        </span>
        <span
          className={`${styles.giftRowChevron} ${open ? styles.giftRowChevronOpen : ''}`}
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <div
        id={panelId}
        className={`${styles.giftRowPanel} ${open ? styles.giftRowPanelOpen : ''}`}
        aria-hidden={!open}
      >
        <div className={styles.giftRowPanelInner}>
          <GiftMessageField lang={lang} value={value} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}
