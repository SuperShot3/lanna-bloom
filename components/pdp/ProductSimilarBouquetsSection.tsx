'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { Bouquet } from '@/lib/bouquets';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { BouquetsCarousel } from '@/components/BouquetsCarousel';
import { trackViewItemList } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';
import { getBouquetDisplayCategory } from '@/lib/catalogCategories';
import { optionDisplayLabel } from '@/lib/bouquetOptions';
import styles from './product-pdp.module.css';

export const PDP_SIMILAR_BOUQUETS_LIST = 'pdp_similar_bouquets';

function bouquetsToAnalyticsItems(bouquets: Bouquet[], lang: Locale): AnalyticsItem[] {
  return bouquets.map((b, i) => {
    const name = lang === 'th' ? b.nameTh : b.nameEn;
    const minPrice = b.sizes?.length ? Math.min(...b.sizes.map((s) => s.price)) : 0;
    return {
      item_id: b.id,
      item_name: name,
      item_category: getBouquetDisplayCategory(b),
      item_variant: b.sizes?.[0] ? optionDisplayLabel(b.sizes[0], lang) : undefined,
      price: minPrice,
      quantity: 1,
      index: i,
    };
  });
}

export function ProductSimilarBouquetsSection({
  bouquets,
  lang,
}: {
  bouquets: Bouquet[];
  lang: Locale;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const t = translations[lang].product as { similarBouquetsTitle?: string };
  const analyticsItems = useMemo(
    () => bouquetsToAnalyticsItems(bouquets, lang),
    [bouquets, lang]
  );

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || analyticsItems.length === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        trackViewItemList(PDP_SIMILAR_BOUQUETS_LIST, analyticsItems);
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: '0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [analyticsItems]);

  if (!bouquets.length) return null;

  return (
    <section
      ref={sectionRef}
      className={styles.similarBouquetsSection}
      aria-labelledby="pdp-similar-bouquets-heading"
    >
      <h2 id="pdp-similar-bouquets-heading" className={styles.similarBouquetsHeading}>
        {t.similarBouquetsTitle ?? 'You might also like'}
      </h2>
      <BouquetsCarousel
        bouquets={bouquets}
        lang={lang}
        listName={PDP_SIMILAR_BOUQUETS_LIST}
        variant="pdpSimilar"
      />
    </section>
  );
}
