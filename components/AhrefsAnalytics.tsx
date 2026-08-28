'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import {
  AHREFS_ANALYTICS_ERROR_API,
  AHREFS_ANALYTICS_EVENT_API,
  AHREFS_ANALYTICS_SCRIPT_SRC,
} from '@/lib/analytics/ahrefs';

const AHREFS_KEY = 'ieRmCTMddVt0d/E4+jI1kg';
const SHOULD_LOAD_AHREFS = process.env.NODE_ENV === 'production';

/**
 * Ahrefs Web Analytics — SEO traffic analytics.
 * Independent of GTM/dataLayer; loads only in production. Skips /admin.
 * Loader is first-party (`/vendor/ahrefs-analytics.js`) so browsers can cache it
 * for 30 days; data-api / data-error keep event posts on analytics.ahrefs.com.
 */
export function AhrefsAnalytics() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) return null;
  if (!SHOULD_LOAD_AHREFS) return null;

  return (
    <Script
      id="ahrefs-analytics"
      src={AHREFS_ANALYTICS_SCRIPT_SRC}
      strategy="lazyOnload"
      data-key={AHREFS_KEY}
      data-api={AHREFS_ANALYTICS_EVENT_API}
      data-error={AHREFS_ANALYTICS_ERROR_API}
    />
  );
}
