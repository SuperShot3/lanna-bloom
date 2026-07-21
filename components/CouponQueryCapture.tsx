'use client';

import { useCouponQueryCapture } from '@/hooks/useCouponQueryCapture';
import type { Locale } from '@/lib/i18n';

/** Mounts coupon query capture inside the lang layout chrome. */
export function CouponQueryCapture({ lang }: { lang: Locale }) {
  useCouponQueryCapture(lang);
  return null;
}
