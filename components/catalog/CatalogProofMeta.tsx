import { StorefrontIcon } from '@/components/icons';
import { translations, type Locale } from '@/lib/i18n';
import styles from './catalog-proof-meta.module.css';

type CatalogProofMetaProps = {
  lang: Locale;
  soldCount?: number;
  variant: 'bouquet' | 'product';
  size?: 'card' | 'pdp';
  className?: string;
};

export function CatalogProofMeta({
  lang,
  soldCount,
  variant,
  size = 'card',
  className = '',
}: CatalogProofMetaProps) {
  const t = translations[lang].catalog;
  const locale = lang === 'th' ? 'th-TH' : 'en-US';
  const soldLabel =
    soldCount != null
      ? (t.soldCount ?? '{count} sold').replace('{count}', soldCount.toLocaleString(locale))
      : null;

  if (variant === 'product') {
    if (!soldLabel) return null;
    return (
      <div className={`${styles.row} ${styles[size]} ${className}`.trim()}>
        <span className={styles.chip} aria-label={soldLabel}>
          <StorefrontIcon name="shopping-bag" size={14} className={styles.icon} />
          <span className={styles.label}>{soldLabel}</span>
        </span>
      </div>
    );
  }

  const handTied = t.factHandTied ?? 'Hand-tied';
  const fresh = t.factFresh ?? 'Fresh';

  return (
    <div className={`${styles.row} ${styles[size]} ${className}`.trim()}>
      <span className={styles.chip}>
        <StorefrontIcon name="local-florist" size={14} className={styles.icon} />
        <span className={styles.label}>{handTied}</span>
      </span>
      {soldLabel ? (
        <span className={styles.chip} aria-label={soldLabel}>
          <StorefrontIcon name="shopping-bag" size={14} className={styles.icon} />
          <span className={styles.label}>{soldLabel}</span>
        </span>
      ) : (
        <span className={styles.chip}>
          <StorefrontIcon name="water-drop" size={14} className={styles.icon} />
          <span className={styles.label}>{fresh}</span>
        </span>
      )}
    </div>
  );
}
