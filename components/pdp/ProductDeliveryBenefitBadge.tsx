'use client';

import { translations, type Locale } from '@/lib/i18n';
import {
  isMay2026FreeDeliveryActive,
  qualifiesForMay2026FreeDelivery,
  MAY_FREE_DELIVERY_END_YMD,
} from '@/lib/promo/campaigns';
import styles from './product-pdp.module.css';

function formatCampaignEndDate(ymd: string, lang: Locale): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function ProductDeliveryBenefitBadge({
  lang,
  lineTotalThb,
  destinationLabel,
}: {
  lang: Locale;
  lineTotalThb: number;
  destinationLabel: string;
}) {
  if (!isMay2026FreeDeliveryActive()) return null;
  if (!qualifiesForMay2026FreeDelivery(lineTotalThb)) return null;

  const t = translations[lang].product;
  const endDate = formatCampaignEndDate(MAY_FREE_DELIVERY_END_YMD, lang);
  const message = (t.pdpFreeDeliveryApplied ?? 'Free delivery in {destination} through {endDate}')
    .replace('{destination}', destinationLabel)
    .replace('{endDate}', endDate);

  return (
    <div className={styles.pdpDeliveryBadge} role="status">
      <svg className={styles.pdpDeliveryBadgeIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 6h11v9H3V6zm11 2h4l3 4v3h-7V8zm-9 11a2 2 0 100-4 2 2 0 000 4zm12 0a2 2 0 100-4 2 2 0 000 4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}
