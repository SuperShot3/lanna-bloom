import type { Locale } from '@/lib/i18n';
import { ProductCard } from '@/components/ProductCard';
import { getPlushyToyBySlugFromSanity, getProductBySlugFromSanity } from '@/lib/sanity';
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

  // Prefer plushyToy documents first, then fall back to partner products.
  const product =
    (await getPlushyToyBySlugFromSanity(trimmed)) ?? (await getProductBySlugFromSanity(trimmed));
  if (!product) return null;

  return (
    <div className={styles.inlineCatalogCard}>
      <ProductCard product={product} lang={lang} />
    </div>
  );
}

