import Image from 'next/image';
import Link from 'next/link';
import { BRAND_LOGO_SRC } from '@/lib/brandLogo';
import styles from '@/app/pay/[orderId]/pay-link.module.css';

export function PayLinkBrand() {
  return (
    <Link href="/" className={styles.brand} aria-label="Lanna Bloom home">
      <Image
        src={BRAND_LOGO_SRC}
        alt="Lanna Bloom logo"
        width={40}
        height={40}
        className={styles.brandLogo}
        priority
      />
      <span className={styles.brandName}>Lanna Bloom</span>
    </Link>
  );
}
