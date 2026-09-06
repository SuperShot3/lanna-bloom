import { StorefrontIcon } from '@/components/icons';
import { translations, type Locale } from '@/lib/i18n';

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

  const rootClass = ['catalog-proof-meta', `catalog-proof-meta--${size}`, className]
    .filter(Boolean)
    .join(' ');

  if (variant === 'product') {
    if (!soldLabel) return null;
    return (
      <div className={rootClass}>
        <span className="catalog-proof-meta__chip" aria-label={soldLabel}>
          <StorefrontIcon name="shopping-bag" size={14} className="catalog-proof-meta__icon" />
          <span className="catalog-proof-meta__label">{soldLabel}</span>
        </span>
      </div>
    );
  }

  const handTied = t.factHandTied ?? 'Hand-tied';
  const fresh = t.factFresh ?? 'Fresh';

  return (
    <div className={rootClass}>
      <span className="catalog-proof-meta__chip">
        <StorefrontIcon name="local-florist" size={14} className="catalog-proof-meta__icon" />
        <span className="catalog-proof-meta__label">{handTied}</span>
      </span>
      {soldLabel ? (
        <span className="catalog-proof-meta__chip" aria-label={soldLabel}>
          <StorefrontIcon name="shopping-bag" size={14} className="catalog-proof-meta__icon" />
          <span className="catalog-proof-meta__label">{soldLabel}</span>
        </span>
      ) : (
        <span className="catalog-proof-meta__chip">
          <StorefrontIcon name="water-drop" size={14} className="catalog-proof-meta__icon" />
          <span className="catalog-proof-meta__label">{fresh}</span>
        </span>
      )}
    </div>
  );
}
