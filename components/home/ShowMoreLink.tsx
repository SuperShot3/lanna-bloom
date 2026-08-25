'use client';

import Link from 'next/link';
import { StorefrontIcon } from '@/components/icons';
import { trackCtaClick } from '@/lib/analytics';

export function ShowMoreLink({
  href,
  label,
  ctaEvent,
}: {
  href: string;
  label: string;
  /** Optional homepage CTA event name (V2 View All, etc.). */
  ctaEvent?: string;
}) {
  return (
    <div className="mt-8 sm:mt-10 flex justify-center">
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
    </div>
  );
}
