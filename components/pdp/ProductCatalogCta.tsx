import { PremiumCtaLink } from '@/components/home/PremiumCtaLink';
import { translations, type Locale } from '@/lib/i18n';
import styles from './product-pdp.module.css';

export function ProductCatalogCta({ lang, href }: { lang: Locale; href: string }) {
  const t = translations[lang].product as { viewMoreProducts?: string };

  return (
    <section className={styles.similarBouquetsSection}>
      <div className={styles.similarBouquetsCta}>
        <PremiumCtaLink
          href={href}
          ctaEvent="cta_pdp_view_more"
          className="w-full max-w-xs sm:w-auto sm:max-w-none"
        >
          {t.viewMoreProducts ?? 'Explore full catalog'}
        </PremiumCtaLink>
      </div>
    </section>
  );
}
