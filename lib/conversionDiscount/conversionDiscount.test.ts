/**
 * High-intent conversion discount: eligibility, expiry, exclusive apply.
 * Run: npx tsx lib/conversionDiscount/conversionDiscount.test.ts
 */

import { CART_FIVE_PERCENT_CODE, getDiscountForCode, INTENT10_CODE } from '@/lib/referral';
import { resolveOrderDiscount } from '@/lib/promo/resolveOrderDiscount';
import { LANNA_BLOOM_COUPON_CODE } from '@/lib/promo/lannaBloomCoupon';
import { MAY_FREE_DELIVERY_CODE } from '@/lib/promo/campaigns';
import { shouldApplyIntent10 } from './applyOffer';
import {
  canStartOffer,
  createInitialVisitorState,
  isHighIntent,
  isOfferActive,
  markPurchaseCompleted,
  recordProductView,
  remainingOfferMs,
  shouldShowPopup,
  startOffer,
  touchSession,
} from './eligibility';
import { INTENT_MIN_SESSION_MS, INTENT_OFFER_DURATION_MS, INTENT_SESSION_IDLE_MS } from './config';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const t0 = 1_700_000_000_000;

function visitorAt(now: number) {
  return createInitialVisitorState(now);
}

// --- Default high-intent rule ---
{
  let state = visitorAt(t0);
  assert(!isHighIntent(state, t0 + 59_000), 'under 60s is not high intent');
  state = recordProductView(state, 'p1', t0 + 10_000);
  state = recordProductView(state, 'p2', t0 + 20_000);
  assert(!isHighIntent(state, t0 + 59_000), '2 views but under 60s is not high intent');
  assert(isHighIntent(state, t0 + INTENT_MIN_SESSION_MS), '60s + 2 unique PDPs is high intent');
}

{
  let state = visitorAt(t0);
  state = recordProductView(state, 'p1', t0 + 10_000);
  state = recordProductView(state, 'p1', t0 + 20_000);
  assert(
    !isHighIntent(state, t0 + INTENT_MIN_SESSION_MS),
    'same product twice does not count as 2 views'
  );
}

// --- Offer timestamps do not reset ---
{
  let state = visitorAt(t0);
  state = recordProductView(state, 'a', t0);
  state = recordProductView(state, 'b', t0);
  const started = startOffer(state, t0 + INTENT_MIN_SESSION_MS);
  const expires = started.discount_offer_expires_at;
  assert(expires === t0 + INTENT_MIN_SESSION_MS + INTENT_OFFER_DURATION_MS, '5 minute window');
  assert(isOfferActive(started, t0 + INTENT_MIN_SESSION_MS + 60_000), 'active 1 min later');
  assert(!canStartOffer(started, t0 + INTENT_MIN_SESSION_MS + 60_000), 'do not start a second window');
  const later = touchSession(started, t0 + INTENT_MIN_SESSION_MS + 90_000);
  assert(later.discount_offer_started_at === started.discount_offer_started_at, 'start ts unchanged');
  assert(later.discount_offer_expires_at === expires, 'expiry ts unchanged');
}

// --- Expiry does not revive in the same session ---
{
  let state = visitorAt(t0);
  state = startOffer(state, t0);
  const afterExpiry = t0 + INTENT_OFFER_DURATION_MS + 1_000;
  assert(!isOfferActive(state, afterExpiry), 'expired');
  assert(!canStartOffer(state, afterExpiry), 'same session after expiry cannot restart');
}

// --- Later session after unused expiry may qualify again ---
{
  let state = visitorAt(t0);
  state = startOffer(state, t0);
  const newSessionAt = t0 + INTENT_OFFER_DURATION_MS + INTENT_SESSION_IDLE_MS + 1_000;
  state = touchSession(state, newSessionAt);
  assert(state.visit_count === 2, 'visit_count increments');
  assert(state.discount_offer_expires_at == null, 'expired offer fields reset on new session');
  assert(canStartOffer(state, newSessionAt), 'new session can start a new window');
}

// --- Purchase blocks the offer ---
{
  let state = visitorAt(t0);
  state = startOffer(state, t0);
  state = markPurchaseCompleted(state, true, t0 + 10_000);
  assert(!canStartOffer(state, t0 + INTENT_SESSION_IDLE_MS * 2), 'purchase never re-offers');
  assert(!isOfferActive(state, t0 + 10_000), 'inactive after purchase');
}

// --- Popup once per window; cart suppresses auto popup ---
{
  let state = visitorAt(t0);
  state = startOffer(state, t0);
  assert(shouldShowPopup(state, t0 + 1_000), 'show popup when browsing without cart');
  state = { ...state, cart_has_items: true };
  assert(!shouldShowPopup(state, t0 + 1_000), 'no popup when cart has items');
  state = { ...state, cart_has_items: false, discount_offer_shown: true };
  assert(!shouldShowPopup(state, t0 + 1_000), 'popup only once per window');
}

// --- Countdown remaining ---
{
  const state = startOffer(visitorAt(t0), t0);
  assert(remainingOfferMs(state, t0) === INTENT_OFFER_DURATION_MS, 'full duration at start');
  assert(remainingOfferMs(state, t0 + INTENT_OFFER_DURATION_MS) === 0, 'zero at expiry');
}

// --- INTENT10 amount is 10% of items, not delivery ---
{
  const amount = getDiscountForCode(INTENT10_CODE, 1200, {
    itemSubtotal: 1000,
    deliveryFee: 200,
  });
  assert(amount === 100, `INTENT10 is 10% of items, got ${amount}`);
  const cart5 = getDiscountForCode(CART_FIVE_PERCENT_CODE, 1200, {
    itemSubtotal: 1000,
    deliveryFee: 200,
  });
  assert(cart5 === 50, 'CART5 is 5% of items');
}

// --- Replace CART5 when INTENT10 is better ---
{
  assert(
    shouldApplyIntent10({
      itemsTotal: 1000,
      deliveryFee: 200,
      storedReferralCode: CART_FIVE_PERCENT_CODE,
    }),
    'INTENT10 replaces CART5'
  );
}

// --- Do not overwrite a held customer code ---
{
  assert(
    !shouldApplyIntent10({
      itemsTotal: 5000,
      deliveryFee: 200,
      storedReferralCode: LANNA_BLOOM_COUPON_CODE,
    }),
    'do not overwrite LANNABLOOM'
  );
}

// --- Do not replace a larger free-delivery campaign ---
{
  const mayNow = new Date('2026-05-20T12:00:00+07:00');
  const campaign = resolveOrderDiscount({
    itemsTotal: 2500,
    deliveryFee: 400,
    now: mayNow,
  });
  assert(campaign?.code === MAY_FREE_DELIVERY_CODE, 'May campaign applies without a code');
  assert(campaign?.discount === 400, 'campaign waives delivery');
  assert(
    !shouldApplyIntent10({
      itemsTotal: 2500,
      deliveryFee: 400,
      storedReferralCode: null,
      now: mayNow,
    }),
    'do not replace ฿400 free delivery with ฿250 item discount'
  );
  assert(
    shouldApplyIntent10({
      itemsTotal: 8000,
      deliveryFee: 200,
      storedReferralCode: null,
      now: mayNow,
    }),
    'INTENT10 wins when 10% items > free delivery'
  );
}

console.log('lib/conversionDiscount/conversionDiscount.test.ts: ok');
