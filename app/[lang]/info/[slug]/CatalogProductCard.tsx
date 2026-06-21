import type { Locale } from '@/lib/i18n';
import Link from 'next/link';
import Image from 'next/image';
import { BouquetCard } from '@/components/BouquetCard';
import { ProductCard } from '@/components/ProductCard';
import { getBouquetBySlugFromSanity, getProductBySlugFromSanity } from '@/lib/sanity';
import { catalogImageUnoptimized } from '@/lib/catalog/catalogImage';
import styles from './article.module.css';

export async function CatalogProductCard({
  slug,
  lang,
  variant = 'default',
}: {
  slug: string;
  lang: Locale;
  variant?: 'default' | 'article-catalog-button';
}) {
  const trimmed = (slug || '').trim();
  if (!trimmed) return null;

  const viewLabel = lang === 'th' ? 'ดูในแคตตาล็อก' : 'View in catalog';
  const href = `/${lang}/catalog/${encodeURIComponent(trimmed)}`;

  const product = await getProductBySlugFromSanity(trimmed);
  if (product) {
    if (variant === 'article-catalog-button') {
      const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
      const imgSrc = product.images?.[0] ?? '';
      const imgAlt = product.imageAlts?.[0]?.trim() || name;
      return (
        <div className={styles.inlineCatalogMini}>
          <div className={styles.inlineCatalogMiniLeft}>
            <div className={styles.inlineCatalogMiniThumb} aria-hidden>
              {imgSrc ? (
                <Image
                  src={imgSrc}
                  alt={imgAlt}
                  fill
                  sizes="168px"
                  className={styles.inlineCatalogMiniThumbImg}
                  unoptimized={catalogImageUnoptimized(imgSrc)}
                  draggable={false}
                />
              ) : (
                <div className={styles.inlineCatalogMiniThumbPlaceholder} />
              )}
            </div>
            <div className={styles.inlineCatalogMiniTitle}>{name}</div>
          </div>
          <Link href={href} className={styles.inlineCatalogMiniButton}>
            {viewLabel}
          </Link>
        </div>
      );
    }
    return (
      <div className={styles.inlineCatalogCard}>
        <ProductCard product={product} lang={lang} />
      </div>
    );
  }

  const bouquet = await getBouquetBySlugFromSanity(trimmed);
  if (bouquet) {
    if (variant === 'article-catalog-button') {
      const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
      const imgSrc = bouquet.images?.[0] ?? '';
      const imgAlt = bouquet.imageAlts?.[0]?.trim() || name;
      return (
        <div className={styles.inlineCatalogMini}>
          <div className={styles.inlineCatalogMiniLeft}>
            <div className={styles.inlineCatalogMiniThumb} aria-hidden>
              {imgSrc ? (
                <Image
                  src={imgSrc}
                  alt={imgAlt}
                  fill
                  sizes="168px"
                  className={styles.inlineCatalogMiniThumbImg}
                  unoptimized={catalogImageUnoptimized(imgSrc)}
                  draggable={false}
                />
              ) : (
                <div className={styles.inlineCatalogMiniThumbPlaceholder} />
              )}
            </div>
            <div className={styles.inlineCatalogMiniTitle}>{name}</div>
          </div>
          <Link href={href} className={styles.inlineCatalogMiniButton}>
            {viewLabel}
          </Link>
        </div>
      );
    }
    return (
      <div className={styles.inlineCatalogCard}>
        <BouquetCard bouquet={bouquet} lang={lang} />
      </div>
    );
  }

  return null;
}

