'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  GOOGLE_PREFERRED_SOURCE_SCRIPT_URL,
  bindPreferredSourceQueue,
} from '@/lib/googlePreferredSource';

/**
 * Loads Google’s Preferred Sources library once, asynchronously.
 * `preferred-sources-control="manual"` prevents Google from scanning/injecting
 * its own button (we render our own link). Skips /admin.
 */
export function GooglePreferredSourceScript() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdmin) return;
    bindPreferredSourceQueue();
  }, [isAdmin]);

  if (isAdmin) return null;

  return (
    <Script
      id="google-preferred-source"
      src={GOOGLE_PREFERRED_SOURCE_SCRIPT_URL}
      strategy="lazyOnload"
      {...{ 'preferred-sources-control': 'manual' }}
    />
  );
}
