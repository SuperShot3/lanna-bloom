import type { Locale } from '@/lib/i18n';
import { BouquetCard } from '@/components/BouquetCard';
import { ProductCard } from '@/components/ProductCard';
import {
  getBalloonBySlugFromSanity,
  getBouquetBySlugFromSanity,
  getPlushyToyBySlugFromSanity,
  getProductBySlugFromSanity,
} from '@/lib/sanity';
import styles from './article.module.css';

export async function CatalogProductCard({
  slug,
  lang,
}: {
  slug: string;
  lang: Locale;
}) {
  const trimmed = (slug || '').trim();
  if (!trimmed) return null;

  // Prefer standalone catalog documents first, then fall back to partner products.
  const product =
    (await getPlushyToyBySlugFromSanity(trimmed)) ??
    (await getBalloonBySlugFromSanity(trimmed)) ??
    (await getProductBySlugFromSanity(trimmed));
  if (product) {
    return (
      <div className={styles.inlineCatalogCard}>
        <ProductCard product={product} lang={lang} />
      </div>
    );
  }

  const bouquet = await getBouquetBySlugFromSanity(trimmed);
  if (bouquet) {
    return (
      <div className={styles.inlineCatalogCard}>
        <BouquetCard bouquet={bouquet} lang={lang} />
      </div>
    );
  }

  return null;
}

