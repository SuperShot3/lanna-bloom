'use client';

import { useState } from 'react';
import type { BouquetSize } from '@/lib/bouquets';
import type { Locale } from '@/lib/i18n';
import {
  friendlyLegacyLabel,
  optionDisplayLabel,
} from '@/lib/bouquetOptions';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { effectiveCatalogUnitPriceWithExpansion } from '@/lib/catalogDiscount';
import styles from './product-pdp.module.css';

function SizeVariantCheck() {
  return (
    <span className={styles.sizeCardCheck} aria-hidden>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M20 6L9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function ProductSizeCard({
  sizes,
  selected,
  onSelect,
  lang,
  destinationId,
  discountPercent,
}: {
  sizes: BouquetSize[];
  selected: BouquetSize;
  onSelect: (size: BouquetSize) => void;
  lang: Locale;
  destinationId: DeliveryDestinationId;
  discountPercent?: number;
}) {
  const [open, setOpen] = useState(false);
  const multiple = sizes.length > 1;
  const displayLabel = optionDisplayLabel(selected, lang);
  const supportLine = friendlyLegacyLabel(selected.label, selected.description);
  const displayPrice = effectiveCatalogUnitPriceWithExpansion(
    selected.price,
    discountPercent,
    destinationId
  );

  const toggle = () => {
    if (multiple) setOpen((v) => !v);
  };

  return (
    <div className={`${styles.pdpBlock} ${styles.mobileOnly}`}>
      <button
        type="button"
        className={`${styles.sizeCard} ${!multiple ? styles.sizeCardSingle : ''}`}
        onClick={toggle}
        aria-expanded={multiple ? open : undefined}
        aria-haspopup={multiple ? 'listbox' : undefined}
        disabled={!multiple}
      >
        <div className={styles.sizeCardHeader}>
          <SizeVariantCheck />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className={styles.sizeCardLabel}>{displayLabel}</div>
            {supportLine && supportLine !== displayLabel ? (
              <div className={styles.sizeCardSub}>{supportLine}</div>
            ) : selected.description ? (
              <div className={styles.sizeCardSub}>{selected.description}</div>
            ) : null}
          </div>
          <span className={styles.sizeCardPrice}>฿{displayPrice.toLocaleString()}</span>
          {multiple ? (
            <span
              className={`${styles.sizeCardChevron} ${open ? styles.sizeCardChevronOpen : ''}`}
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : null}
        </div>
        {multiple && open ? (
          <div className={styles.sizePickerList} role="listbox" aria-label="Bouquet options">
            {sizes.map((size) => {
              const label = optionDisplayLabel(size, lang);
              const price = effectiveCatalogUnitPriceWithExpansion(
                size.price,
                discountPercent,
                destinationId
              );
              const isActive = size.optionId === selected.optionId;
              return (
                <button
                  key={size.optionId}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`${styles.sizePickerOption} ${isActive ? styles.sizePickerOptionActive : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(size);
                    setOpen(false);
                  }}
                >
                  {isActive ? (
                    <SizeVariantCheck />
                  ) : (
                    <span className={styles.sizePickerOptionCheckSpacer} aria-hidden />
                  )}
                  <span className={styles.sizePickerOptionLabel}>{label}</span>
                  <span className={styles.sizePickerOptionPrice}>฿{price.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </button>
    </div>
  );
}
