'use client';

import Link from 'next/link';
import { Flower5Icon } from '@/components/icons/Flower5Icon';
import { translations, type Locale } from '@/lib/i18n';
import styles from './product-pdp.module.css';

const ICON_TICK = (
  <svg className={styles.trustStripIcon} width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="M2 7l3 4 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICON_SHIELD = (
  <svg className={styles.trustStripIcon} width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="M7 1L2 3v4c0 4 5 6 5 6s5-2 5-6V3L7 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
  </svg>
);
const ICON_DELIVERY = (
  <svg className={styles.trustStripIcon} width="18" height="18" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M1.5 3.25h5.5v3.5H1.5zM7 4h2l1 1.25V6.75H7z" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="3" cy="8.5" r="0.75" fill="currentColor" />
    <circle cx="8.75" cy="8.5" r="0.75" fill="currentColor" />
  </svg>
);

export function ProductTrustStrip({
  lang,
  showSameDay = true,
  destinationSub,
}: {
  lang: Locale;
  showSameDay?: boolean;
  /** Shown in column 1 when same-day chip is hidden (expansion markets) */
  destinationSub?: string;
}) {
  const t = translations[lang].trustBadges as {
    freshFlowersShort?: string;
    freshFlowersSub?: string;
    securePaymentsShort?: string;
    securePaymentsSub?: string;
    deliveryPolicyShort?: string;
    deliveryPolicySub?: string;
  };

  return (
    <div className={styles.trustStrip} role="list">
      <div className={styles.trustStripItem} role="listitem">
        {showSameDay ? (
          <>
            <Flower5Icon className={styles.trustStripIcon} bold />
            <span className={styles.trustStripTitle}>{t.freshFlowersShort ?? 'Fresh flowers'}</span>
            <span className={styles.trustStripSub}>{t.freshFlowersSub ?? 'Hand-crafted'}</span>
          </>
        ) : (
          <>
            {ICON_TICK}
            <span className={styles.trustStripTitle}>{lang === 'th' ? 'จัดส่ง' : 'Delivery'}</span>
            <span className={styles.trustStripSub}>{destinationSub ?? ''}</span>
          </>
        )}
      </div>
      <div className={styles.trustStripItem} role="listitem">
        {ICON_SHIELD}
        <span className={styles.trustStripTitle}>{t.securePaymentsShort ?? 'Secure'}</span>
        <span className={styles.trustStripSub}>{t.securePaymentsSub ?? 'Stripe checkout'}</span>
      </div>
      <Link
        href={`/${lang}/info/delivery-policy`}
        className={`${styles.trustStripLink} ${styles.trustStripItem}`}
        role="listitem"
      >
        {ICON_DELIVERY}
        <span className={styles.trustStripTitle}>{t.deliveryPolicyShort ?? 'Delivery policy'}</span>
        <span className={styles.trustStripSub}>{t.deliveryPolicySub ?? ''}</span>
      </Link>
    </div>
  );
}
