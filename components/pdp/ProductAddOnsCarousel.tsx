'use client';

import { useRef, useState } from 'react';
import { GiftsCarousel } from '@/components/GiftsCarousel';
import { AddOnsModal } from '@/components/pdp/AddOnsModal';
import type { CatalogProduct } from '@/lib/catalog/types';
import { translations, type Locale } from '@/lib/i18n';
import styles from './product-pdp.module.css';

export function ProductAddOnsCarousel({
  lang,
  gifts,
}: {
  lang: Locale;
  gifts: CatalogProduct[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const viewAllRef = useRef<HTMLButtonElement>(null);

  if (!gifts.length) return null;

  const t = translations[lang].product;

  return (
    <div className={styles.pdpBlock}>
      <div className={styles.addOnsHeader}>
        <h3 className={styles.addOnsHeading}>
          {t.makeItExtraSpecial ?? 'Make it extra special'}
        </h3>
        <button
          type="button"
          ref={viewAllRef}
          className={styles.addOnsViewAll}
          onClick={() => setIsModalOpen(true)}
        >
          {t.viewAllAddOns ?? 'View all'}
        </button>
      </div>
      <GiftsCarousel gifts={gifts} lang={lang} />
      <AddOnsModal
        lang={lang}
        gifts={gifts}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        triggerRef={viewAllRef}
      />
    </div>
  );
}
