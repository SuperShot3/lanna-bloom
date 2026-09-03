import { translations, type Locale } from '@/lib/i18n';
import styles from './product-pdp.module.css';

export function ProductCodeLine({
  lang,
  productCode,
}: {
  lang: Locale;
  productCode?: string;
}) {
  const code = productCode?.trim();
  if (!code) return null;

  return (
    <p className={styles.productCode}>
      {translations[lang].catalog.productCode}: {code}
    </p>
  );
}
