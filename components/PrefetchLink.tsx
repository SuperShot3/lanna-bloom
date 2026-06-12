'use client';

import { useRouter } from 'next/navigation';
import { Link } from 'next-view-transitions';
import { useRef, useEffect, useCallback } from 'react';

const PREFETCH_MARGIN_PX = 200;

export interface PrefetchLinkProps extends Omit<React.ComponentProps<typeof Link>, 'href'> {
  href: string;
  children: React.ReactNode;
  /** Optional: skip prefetch (e.g. for external links) */
  prefetch?: boolean;
}

/**
 * Link that triggers View Transitions and prefetches on hover/touchstart
 * and when near viewport (intersection observer).
 */
export function PrefetchLink({ href, children, prefetch = true, ...rest }: PrefetchLinkProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const doPrefetch = useCallback(() => {
    if (!prefetch || typeof href !== 'string' || href.startsWith('#') || href.startsWith('http')) return;
    router.prefetch(href);
  }, [href, prefetch, router]);

  useEffect(() => {
    if (!prefetch || !wrapperRef.current) return;
    const el = wrapperRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            doPrefetch();
            break;
          }
        }
      },
      { rootMargin: `${PREFETCH_MARGIN_PX}px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [doPrefetch, prefetch]);

  return (
    <span
      ref={wrapperRef}
      style={{ display: 'block' }}
      onMouseEnter={doPrefetch}
      onTouchStart={doPrefetch}
    >
      <Link href={href} prefetch={prefetch} {...rest}>
        {children}
      </Link>
    </span>
  );
}
