'use client';

import Link from 'next/link';
import { GiftsCarousel } from '@/components/GiftsCarousel';
import type { CatalogProduct } from '@/lib/sanity';
import { translations, type Locale } from '@/lib/i18n';
import styles from './product-pdp.module.css';

export function ProductAddOnsCarousel({
  lang,
  gifts,
}: {
  lang: Locale;
  gifts: CatalogProduct[];
}) {
  if (!gifts.length) return null;

  const t = translations[lang].product;
  const viewAllHref = `/${lang}/catalog?category=gifts`;

  return (
    <div className={styles.pdpBlock}>
      <div className={styles.addOnsHeader}>
        <h3 className={styles.addOnsHeading}>
          {t.makeItExtraSpecial ?? 'Make it extra special'}
        </h3>
        <Link href={viewAllHref} className={styles.addOnsViewAll}>
          {t.viewAllAddOns ?? 'View all'}
        </Link>
      </div>
      <GiftsCarousel gifts={gifts} lang={lang} />
    </div>
  );
}
