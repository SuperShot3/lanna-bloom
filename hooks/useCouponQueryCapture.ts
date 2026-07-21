'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { storeReferral, validateReferralCode, getDiscountCodeDefinition } from '@/lib/referral';
import { isLannaBloomCouponCode, isLannaBloomCouponActive } from '@/lib/promo/lannaBloomCoupon';
import type { Locale } from '@/lib/i18n';

/**
 * Capture `?coupon=CODE` into the existing referral localStorage session,
 * then strip the query param. Discount applies when the cart becomes eligible.
 */
export function useCouponQueryCapture(lang: Locale) {
  const router = useRouter();
  const pathname = usePathname();
  const capturedRef = useRef(false);

  useEffect(() => {
    if (capturedRef.current) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const raw = params.get('coupon')?.trim();
    if (!raw) return;

    capturedRef.current = true;
    const validated = validateReferralCode(raw);
    if (validated.valid) {
      const known =
        !!getDiscountCodeDefinition(validated.code) ||
        validated.code.startsWith('WELCOME10-');
      const lannaOk =
        !isLannaBloomCouponCode(validated.code) || isLannaBloomCouponActive();
      if (known && lannaOk) {
        storeReferral(validated.code);
      }
    }

    params.delete('coupon');
    const next = params.toString();
    const path = pathname || `/${lang}`;
    router.replace(next ? `${path}?${next}` : path);
  }, [lang, pathname, router]);
}
