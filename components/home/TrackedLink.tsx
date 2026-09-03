'use client';

import Link from 'next/link';
import { trackCtaClick } from '@/lib/analytics';

export function TrackedLink({
  href,
  event,
  eventParams,
  className,
  children,
}: {
  href: string;
  event?: string;
  eventParams?: Record<string, unknown>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={event ? () => trackCtaClick(event, eventParams) : undefined}
    >
      {children}
    </Link>
  );
}
