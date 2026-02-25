'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';
import { setCookie, getCookie } from '@/lib/cookies';

const COOKIE_NAME = 'is_internal_staff';
const COOKIE_VALUE = 'true';

/**
 * Pushes traffic_type: "internal" to dataLayer for GA4 internal traffic exclusion.
 * Must run before GTM so GTM can read it on first pageview.
 * Handles: initial URL param, cookie persistence, SPA route changes.
 */
function pushInternalTrafficToDataLayer(): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ traffic_type: 'internal' });
}

export function InternalTrafficBootstrap() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    // 1) Check URL for internal_user=true and set cookie
    const params = new URLSearchParams(window.location.search);
    if (params.get('internal_user') === 'true') {
      const domainPart = window.location.hostname?.includes('lannabloom.shop') ? ' Domain=.lannabloom.shop;' : '';
      document.cookie = `${COOKIE_NAME}=${COOKIE_VALUE}; Max-Age=31536000; Path=/;${domainPart} SameSite=Lax; Secure`;
      console.log('Internal Cookie Set Successfully');

      // Remove param from URL to avoid sharing links
      params.delete('internal_user');
      const newSearch = params.toString();
      const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // 2) If cookie exists and value === "true", push to dataLayer
    const cookieVal = getCookie(COOKIE_NAME);
    if (cookieVal === COOKIE_VALUE) {
      const isRouteChange = prevPathRef.current !== null && prevPathRef.current !== pathname;
      prevPathRef.current = pathname;

      // Push on route change; initial load is handled by head script
      if (isRouteChange) {
        pushInternalTrafficToDataLayer();
      }
    } else {
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  return null;
}
