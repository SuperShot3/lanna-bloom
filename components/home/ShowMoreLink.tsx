'use client';

import Link from 'next/link';
import { StorefrontIcon } from '@/components/icons';
import { PremiumCtaLink } from '@/components/home/PremiumCtaLink';
import { trackCtaClick } from '@/lib/analytics';

export function ShowMoreLink({
  href,
  label,
  ctaEvent,
  premium = false,
}: {
  href: string;
  label: string;
  /** Optional homepage CTA event name (V2 View All, etc.). */
  ctaEvent?: string;
  /** Match the hero premium CTA (Homepage V2 View all bouquets). */
  premium?: boolean;
}) {
  return (
    <div className="mt-8 sm:mt-10 flex justify-center">
      {premium ? (
        <PremiumCtaLink
          href={href}
          onClick={ctaEvent ? () => trackCtaClick(ctaEvent) : undefined}
        >
          {label}
        </PremiumCtaLink>
      ) : (
        <Link
          href={href}
          className="popular-show-more group"
          onClick={ctaEvent ? () => trackCtaClick(ctaEvent) : undefined}
        >
          <span>{label}</span>
          <StorefrontIcon
            name="arrow-forward"
            size={18}
            className="popular-show-more__icon"
          />
        </Link>
      )}
    </div>
  );
}
