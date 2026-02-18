'use client';

import Link from 'next/link';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export interface TrustBadgesProps {
  lang: Locale;
  /** Show same-day delivery chip (Chiang Mai) */
  sameDayDelivery?: boolean;
  /** Show secure payments chip */
  securePayments?: boolean;
  /** Show real reviews link */
  realReviews?: boolean;
  /** Show refund & replacement policy link */
  refundPolicy?: boolean;
}

const ICON_TICK = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="M2 7l3 4 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICON_SHIELD = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="M7 1L2 3v4c0 4 5 6 5 6s5-2 5-6V3L7 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
  </svg>
);
const ICON_STAR = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="M7 1l1.5 4.5L13 6l-3.5 3 1 4.5L7 11l-3.5 2.5 1-4.5L1 6l4.5-.5L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
  </svg>
);
const ICON_REFUND = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="M3 7h8M3 7l3-3M3 7l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function TrustBadges({
  lang,
  sameDayDelivery = true,
  securePayments = true,
  realReviews = true,
  refundPolicy = true,
}: TrustBadgesProps) {
  const tRaw = translations[lang] as { trustBadges?: Record<string, string> };
  const t = tRaw.trustBadges ?? {
    sameDayDelivery: 'Same-day delivery in Chiang Mai',
    securePayments: 'Secure payments',
    realReviews: 'Real reviews',
    refundPolicy: 'Refund & replacement policy',
  };

  const items: { icon: React.ReactNode; text: string; href?: string }[] = [];
  if (sameDayDelivery) items.push({ icon: ICON_TICK, text: t.sameDayDelivery });
  if (securePayments) items.push({ icon: ICON_SHIELD, text: t.securePayments });
  if (realReviews) items.push({ icon: ICON_STAR, text: t.realReviews, href: `/${lang}/reviews` });
  if (refundPolicy) items.push({ icon: ICON_REFUND, text: t.refundPolicy, href: `/${lang}/refund-replacement` });

  if (items.length === 0) return null;

  return (
    <div className="trust-badges" role="list">
      {items.map((item, i) => (
        <div key={i} className="trust-badges-item" role="listitem">
          <span className="trust-badges-icon" aria-hidden>
            {item.icon}
          </span>
          {item.href ? (
            <Link href={item.href} className="trust-badges-link">
              {item.text}
            </Link>
          ) : (
            <span className="trust-badges-text">{item.text}</span>
          )}
        </div>
      ))}
      <style jsx>{`
        .trust-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 16px;
          margin-top: 12px;
        }
        .trust-badges-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .trust-badges-icon {
          flex-shrink: 0;
          color: var(--accent);
        }
        .trust-badges-text {
          line-height: 1.3;
        }
        .trust-badges-link {
          color: var(--text-muted);
          text-decoration: underline;
          text-underline-offset: 2px;
          line-height: 1.3;
        }
        .trust-badges-link:hover {
          color: var(--accent);
        }
      `}</style>
    </div>
  );
}
