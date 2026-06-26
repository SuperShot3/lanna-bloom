'use client';

import { useEffect, useId, useState } from 'react';
import { translations, type Locale } from '@/lib/i18n';
import {
  WRAPPING_PAPER_COLORS,
  getWrappingPaperColorLabel,
  isSpecificWrappingPaperColor,
  type WrappingPaperColorId,
  type WrappingPaperColorSelection,
} from '@/lib/wrappingPaperColors';
import styles from './product-pdp.module.css';

export function ProductPaperColorRow({
  lang,
  value,
  onChange,
}: {
  lang: Locale;
  value: WrappingPaperColorSelection;
  onChange: (color: WrappingPaperColorSelection) => void;
}) {
  const [open, setOpen] = useState(isSpecificWrappingPaperColor(value));
  const panelId = useId();
  const t = translations[lang].product;

  useEffect(() => {
    if (isSpecificWrappingPaperColor(value)) setOpen(true);
  }, [value]);

  return (
    <div className={`${styles.giftRow} ${styles.paperColorGiftRow}`}>
      <button
        type="button"
        className={styles.giftRowToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className={styles.giftRowToggleStart}>
          <span>
            <span className={styles.giftRowToggleLabel}>
              {t.paperColorToggle ?? 'Customize wrapping paper color'}
            </span>
            {' '}
            <span className={styles.giftRowOptional}>
              ({t.paperColorOptional ?? 'Optional'})
            </span>
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
        <div className={`${styles.giftRowPanelInner} ${styles.paperColorPanelInner}`}>
          <div className={styles.paperColorSwatchRow} role="group" aria-label={t.paperColorToggle}>
            {WRAPPING_PAPER_COLORS.map((color) => {
              const selected = value === color.id;
              const label = getWrappingPaperColorLabel(color.id, lang);
              const isFloristChoice = color.id === 'none';
              return (
                <div key={color.id} className={styles.paperColorSwatchWrap}>
                  <button
                    type="button"
                    className={`${styles.paperColorSwatch} ${isFloristChoice ? styles.paperColorSwatchFlorist : ''} ${selected ? styles.paperColorSwatchActive : ''}`}
                    style={color.hex ? { backgroundColor: color.hex } : undefined}
                    onClick={() =>
                      onChange(
                        color.id === 'none' ? null : (color.id as WrappingPaperColorId)
                      )
                    }
                    aria-pressed={selected}
                    aria-label={label}
                    title={label}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
