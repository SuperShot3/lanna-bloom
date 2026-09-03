'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useFlowerFilterSheetOpen } from '@/contexts/FlowerFilterSheetOpenContext';
import { useCheckoutDeliveryProfile } from '@/hooks/useCheckoutDeliveryProfile';
import { trackDiscountEvent, type DiscountExperimentEventName } from '@/lib/analytics';
import { cartPriceBreakdown } from '@/lib/cart/cartPriceBreakdown';
import { hasCatalogDiscount } from '@/lib/catalogDiscount';
import {
  INTENT_DISCOUNT_ENABLED,
  INTENT_MIN_SESSION_MS,
} from '@/lib/conversionDiscount/config';
import { shouldApplyIntent10 } from '@/lib/conversionDiscount/applyOffer';
import {
  canStartOffer,
  formatCountdown,
  isHighIntent,
  isOfferActive,
  isOfferExpiredUnused,
  markAnalyticsFired,
  markOfferActivated,
  markOfferShown,
  markPillDismissed,
  remainingOfferMs,
  shouldShowPopup,
  shouldUseAbandonedCartCopy,
  startOffer,
  visitorType,
  withCartHasItems,
} from '@/lib/conversionDiscount/eligibility';
import { loadAndTouchVisitorState, writeVisitorState } from '@/lib/conversionDiscount/storage';
import type { VisitorState } from '@/lib/conversionDiscount/types';
import {
  clearReferral,
  getStoredReferral,
  INTENT10_CODE,
  isIntentTenPercentCode,
  storeReferral,
} from '@/lib/referral';
import type { Locale } from '@/lib/i18n';
import { DiscountOfferPopup } from './DiscountOfferPopup';
import { DiscountTimerPill } from './DiscountTimerPill';

function deviceType(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

function analyticsParams(state: VisitorState, extras: { cartValue?: number; discountValue?: number } = {}) {
  return {
    visitor_type: visitorType(state),
    visit_count: state.visit_count,
    product_view_count: state.viewed_product_ids.length,
    time_before_offer:
      state.discount_offer_started_at != null
        ? Math.max(0, Math.round((state.discount_offer_started_at - state.session_started_at) / 1000))
        : Math.max(0, Math.round((Date.now() - state.session_started_at) / 1000)),
    device_type: deviceType(),
    ...(extras.cartValue != null ? { cart_value: extras.cartValue } : {}),
    ...(extras.discountValue != null ? { discount_value: extras.discountValue } : {}),
  };
}

function fireOnce(
  state: VisitorState,
  event: DiscountExperimentEventName,
  extras: { cartValue?: number; discountValue?: number } = {}
): VisitorState {
  if (state.analytics_fired.includes(event)) return state;
  trackDiscountEvent(event, analyticsParams(state, extras));
  const next = markAnalyticsFired(state, event);
  writeVisitorState(next);
  return next;
}

export function ConversionDiscountRoot({ lang }: { lang: Locale }) {
  const pathname = usePathname() ?? '';
  const { items, hydrated, lastAddEventId } = useCart();
  const { isOpen: flowerFilterSheetOpen } = useFlowerFilterSheetOpen();
  const deliveryProfile = useCheckoutDeliveryProfile(lang);
  const [state, setState] = useState<VisitorState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const lastAddSeenRef = useRef(lastAddEventId);

  const enabled = INTENT_DISCOUNT_ENABLED;
  const cartHasItems = hydrated && items.length > 0;
  const isCartRoute = pathname.includes('/cart');
  const isPdpRoute = /\/catalog\/[^/]+/.test(pathname);

  const itemsTotal = useMemo(() => {
    if (!items.length) return 0;
    return cartPriceBreakdown(items, deliveryProfile.destinationId).itemsTotal;
  }, [items, deliveryProfile.destinationId]);

  const hasCatalogProductDiscount = items.some((item) => hasCatalogDiscount(item.catalogDiscountPercent));

  const tryStoreIntent10 = useCallback(
    (visitor: VisitorState, forceArmEmptyCart = false) => {
      if (!isOfferActive(visitor, Date.now())) return;
      const stored = getStoredReferral()?.code ?? null;
      if (!items.length) {
        if (forceArmEmptyCart && (!stored || isIntentTenPercentCode(stored))) {
          storeReferral(INTENT10_CODE);
        }
        return;
      }
      if (
        shouldApplyIntent10({
          itemsTotal,
          deliveryFee: 0,
          storedReferralCode: stored,
          deliveryDestination: deliveryProfile.destinationId,
          hasCatalogProductDiscount,
        })
      ) {
        if (!isIntentTenPercentCode(stored)) {
          storeReferral(INTENT10_CODE);
        }
      }
    },
    [items.length, itemsTotal, deliveryProfile.destinationId, hasCatalogProductDiscount]
  );

  const clearIntentCodeIfExpired = useCallback((visitor: VisitorState, at: number) => {
    if (isOfferExpiredUnused(visitor, at) && isIntentTenPercentCode(getStoredReferral()?.code)) {
      clearReferral();
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const next = loadAndTouchVisitorState(Date.now(), {
      documentVisible: document.visibilityState !== 'hidden',
    });
    setState(next);
    setNow(Date.now());
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !state) return;
    let timer: number | undefined;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (timer != null) {
        window.clearTimeout(timer);
        timer = undefined;
      }
      const at = Date.now();
      const visible = document.visibilityState !== 'hidden';
      let next = loadAndTouchVisitorState(at, { documentVisible: visible });
      next = withCartHasItems(next, cartHasItems, at);
      writeVisitorState(next);
      if (visible && canStartOffer(next, at) && isHighIntent(next, at)) {
        next = startOffer(next, at);
        writeVisitorState(next);
        next = fireOnce(next, 'discount_eligible', { cartValue: itemsTotal });
      }
      if (isOfferExpiredUnused(next, at)) {
        next = fireOnce(next, 'discount_timer_expired', { cartValue: itemsTotal });
        clearIntentCodeIfExpired(next, at);
      }
      setState(next);
      setNow(at);

      if (isOfferActive(next, at)) {
        timer = window.setTimeout(tick, 1000);
        return;
      }
      if (next.purchase_completed || next.discount_offer_used) return;
      const untilMinSession = INTENT_MIN_SESSION_MS - (at - next.session_started_at);
      const delay =
        untilMinSession > 0 ? Math.min(untilMinSession + 50, 30_000) : 15_000;
      timer = window.setTimeout(tick, Math.max(delay, 1000));
    };

    tick();
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, state?.visitor_id, cartHasItems, itemsTotal, clearIntentCodeIfExpired, pathname]);

  useEffect(() => {
    if (!enabled || !state || !hydrated) return;
    tryStoreIntent10(state);
  }, [enabled, state, hydrated, tryStoreIntent10, cartHasItems]);

  useEffect(() => {
    if (!enabled || !state) return;
    if (lastAddEventId === lastAddSeenRef.current) return;
    lastAddSeenRef.current = lastAddEventId;
    if (lastAddEventId <= 0) return;
    if (!isOfferActive(state, Date.now())) return;
    tryStoreIntent10(state);
    setState((prev) => (prev ? fireOnce(prev, 'discount_added_to_cart', { cartValue: itemsTotal }) : prev));
  }, [enabled, lastAddEventId, state, tryStoreIntent10, itemsTotal]);

  const offerActive = Boolean(state && isOfferActive(state, now));
  const remaining = state && offerActive ? remainingOfferMs(state, now) : 0;
  const showAutoPopup =
    Boolean(state && offerActive && shouldShowPopup(state, now)) && !isCartRoute;
  const showDetails = detailsOpen && offerActive && Boolean(state);
  const showPopup = (showAutoPopup || showDetails) && !flowerFilterSheetOpen;
  const showPill =
    offerActive &&
    Boolean(state) &&
    !state?.pill_dismissed &&
    !showPopup &&
    !flowerFilterSheetOpen &&
    remaining > 0;

  useEffect(() => {
    if (!showAutoPopup || !state) return;
    setState((prev) => {
      if (!prev || prev.discount_offer_shown) return prev;
      const marked = markOfferShown(prev);
      writeVisitorState(marked);
      return fireOnce(marked, 'discount_popup_shown', { cartValue: itemsTotal });
    });
  }, [showAutoPopup, state?.discount_offer_shown, itemsTotal]);

  const abandonedCopy = Boolean(state && (shouldUseAbandonedCartCopy(state, now) || state.cart_has_items));

  const handleAccept = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const next = markOfferActivated(prev);
      writeVisitorState(next);
      tryStoreIntent10(next, true);
      const fired = fireOnce(next, 'discount_offer_activated', {
        cartValue: itemsTotal,
        discountValue: Math.floor(itemsTotal * 0.1),
      });
      return fired;
    });
    setDetailsOpen(false);
  }, [itemsTotal, tryStoreIntent10]);

  const handleClosePopup = useCallback(() => {
    setDetailsOpen(false);
    setState((prev) => {
      if (!prev) return prev;
      const next = markOfferShown(prev);
      writeVisitorState(next);
      return fireOnce(next, 'discount_popup_closed', { cartValue: itemsTotal });
    });
  }, [itemsTotal]);

  const handleDismissPill = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const next = markPillDismissed(prev);
      writeVisitorState(next);
      return next;
    });
  }, []);

  if (!enabled || !state) return null;

  return (
    <>
      {showPopup ? (
        <DiscountOfferPopup
          lang={lang}
          remainingMs={remaining}
          abandoned={abandonedCopy}
          liftForCart={isCartRoute}
          onAccept={handleAccept}
          onClose={handleClosePopup}
        />
      ) : null}
      {showPill ? (
        <DiscountTimerPill
          lang={lang}
          remainingMs={remaining}
          liftForCart={isCartRoute}
          liftForPdp={isPdpRoute && !isCartRoute}
          onOpen={() => setDetailsOpen(true)}
          onDismiss={handleDismissPill}
        />
      ) : null}
      <span className="sr-only" aria-live="off">
        {offerActive ? formatCountdown(remaining) : ''}
      </span>
    </>
  );
}
