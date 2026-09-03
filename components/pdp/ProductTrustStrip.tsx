import { translations, type Locale } from '@/lib/i18n';
import styles from './product-pdp.module.css';

export function ProductTrustStrip({ lang }: { lang: Locale }) {
  const t = translations[lang].product;
  const parts = [
    t.trustFreshlyMade ?? 'Freshly made',
    t.trustSecurePayment ?? 'Secure payment',
    t.trustReliableDelivery ?? 'Reliable delivery',
  ];

  return (
    <p className={styles.trustReassurance}>
      {parts.join(' · ')}
    </p>
  );
}
