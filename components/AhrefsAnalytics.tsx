'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

const AHREFS_KEY = 'ieRmCTMddVt0d/E4+jI1kg';
const SHOULD_LOAD_AHREFS = process.env.NODE_ENV === 'production';

/**
 * Ahrefs Web Analytics — SEO traffic analytics.
 * Independent of GTM/dataLayer; loads only in production. Skips /admin.
 */
export function AhrefsAnalytics() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) return null;
  if (!SHOULD_LOAD_AHREFS) return null;

  return (
    <Script
      id="ahrefs-analytics"
      src="https://analytics.ahrefs.com/analytics.js"
      strategy="lazyOnload"
      data-key={AHREFS_KEY}
    />
  );
}
