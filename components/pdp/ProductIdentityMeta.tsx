import { translations, type Locale } from '@/lib/i18n';
import { StorefrontIcon } from '@/components/icons';
import { CatalogProofMeta } from '@/components/catalog/CatalogProofMeta';
import styles from './product-pdp.module.css';

type ProductIdentityMetaProps = {
  lang: Locale;
  featuredPopular?: boolean;
  isNewArrival?: boolean;
  soldCount?: number;
};

export function ProductIdentityMeta({
  lang,
  featuredPopular,
  isNewArrival,
  soldCount,
}: ProductIdentityMetaProps) {
  const tCatalog = translations[lang].catalog;
  const showPopular = featuredPopular === true;
  const showNew = !showPopular && isNewArrival === true;

  return (
    <div className={styles.identityMeta}>
      <CatalogProofMeta lang={lang} variant="bouquet" soldCount={soldCount} size="pdp" />
      {showPopular ? (
        <>
          <span className={styles.identityMetaSep} aria-hidden>
            |
          </span>
          <span className={styles.popularBadge} aria-label={tCatalog.popularPickAria}>
            <span className={styles.popularBadgeIconWrap} aria-hidden>
              <StorefrontIcon name="local-fire-department" filled className={styles.popularBadgeIcon} size={16} />
            </span>
            <span className={styles.popularBadgeLabel}>{tCatalog.popularPickBadge}</span>
          </span>
        </>
      ) : null}
      {showNew ? (
        <>
          <span className={styles.identityMetaSep} aria-hidden>
            |
          </span>
          <span className={styles.newArrivalBadge} aria-label={tCatalog.newArrivalAria}>
            {tCatalog.newArrivalBadge}
          </span>
        </>
      ) : null}
    </div>
  );
}
