/**
 * High-intent conversion discount experiment.
 * Kill switch: NEXT_PUBLIC_INTENT_DISCOUNT_ENABLED=false
 */

import { INTENT10_CODE } from '@/lib/referral';

export { INTENT10_CODE };

/** Set NEXT_PUBLIC_INTENT_DISCOUNT_ENABLED=false to stop the experiment without a code revert. */
export const INTENT_DISCOUNT_ENABLED =
  process.env.NEXT_PUBLIC_INTENT_DISCOUNT_ENABLED !== 'false';

export const INTENT_DISCOUNT_PERCENT = 10;
export const INTENT_OFFER_DURATION_MS = 5 * 60 * 1000;
export const INTENT_MIN_SESSION_MS = 60 * 1000;
export const INTENT_MIN_UNIQUE_PRODUCT_VIEWS = 2;
export const INTENT_SESSION_IDLE_MS = 30 * 60 * 1000;
export const INTENT_VIEWED_PRODUCT_IDS_CAP = 30;

export const INTENT_STORAGE_KEY = 'lanna-bloom-intent-offer';
