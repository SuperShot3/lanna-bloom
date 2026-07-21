'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { useCheckoutStickyHeader } from '@/contexts/CheckoutStickyHeaderContext';
import { translations } from '@/lib/i18n';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import { SocialLinks } from '@/components/SocialLinks';
import type { CartItem } from '@/contexts/CartContext';
import {
  isDeliveryTimeSlotSelectableForDate,
  type DeliveryFormValues,
} from '@/components/DeliveryForm';
import { PremiumCheckoutFlow } from '@/components/checkout/premium/PremiumCheckoutFlow';
import { CheckoutBottomAction } from '@/components/checkout/CheckoutBottomAction';
import type { CheckoutDeliveryProfile } from '@/hooks/useCheckoutDeliveryProfile';
import type { CheckoutSectionId } from '@/lib/checkout/premiumCheckoutValidation';
import { getShopTodayYmd, getShopTomorrowYmd } from '@/lib/deliveryHours';
import type { CountryCodeEntry } from '@/lib/checkout/phoneCountryDial';

function formatCheckoutStickySchedule(
  delivery: DeliveryFormValues,
  lang: Locale,
  todayLabel: string,
  tomorrowLabel: string
): string | null {
  const { date, timeSlot } = delivery;
  if (!date || !timeSlot) return null;
  if (!isDeliveryTimeSlotSelectableForDate(date, timeSlot)) return null;

  const todayStr = getShopTodayYmd();
  const tomorrowStr = getShopTomorrowYmd();
  let dateLabel: string;
  if (date === todayStr) dateLabel = todayLabel;
  else if (date === tomorrowStr) dateLabel = tomorrowLabel;
  else {
    const d = new Date(`${date}T12:00:00+07:00`);
    dateLabel = d.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
      timeZone: 'Asia/Bangkok',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }
  return `${dateLabel} · ${timeSlot}`;
}

function buildStickyItemSummary(items: CartItem[], lang: Locale): string | null {
  if (items.length === 0) return null;
  const totalQty = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  const primary = items[0];
  const primaryName = lang === 'th' ? primary.nameTh : primary.nameEn;
  if (totalQty <= 1) return primaryName;
  return `${primaryName} +${totalQty - 1}`;
}

function hasToyItemInCart(items: CartItem[]): boolean {
  return items.some((item) => (item.itemType ?? 'bouquet') === 'plushyToy');
}

export function CartCheckoutView({
  lang,
  items,
  delivery,
  onDeliveryChange,
  checkoutDeliveryProfile,
  recipientName,
  onRecipientNameChange,
  recipientCountryCode,
  onRecipientCountryCodeChange,
  recipientPhoneNational,
  onRecipientPhoneNationalChange,
  surpriseDelivery,
  onSurpriseDeliveryChange,
  orderingForSomeoneElse,
  onOrderingForSomeoneElseChange,
  cardMessage,
  onCardMessageChange,
  noCardMessage,
  onNoCardMessageChange,
  senderFields,
  phoneCountryPopular,
  phoneCountryAll,
  itemsTotal,
  bouquetSubtotal,
  addOnsTotal,
  otherItemsSubtotal,
  deliveryFee,
  deliveryFeeGross,
  discount,
  discountLabel,
  grandTotal,
  mayCampaignProgressRemaining,
  appliedReferralCode,
  storedReferralCode,
  referralIneligibleReason = null,
  hasCatalogProductDiscount = false,
  onReferralChange,
  mayCampaignEligible,
  highlightSection,
  highlightMapsLink = false,
  sectionRefs,
  onRemoveItem,
  onChangeItemQuantity,
  isPaymentUnlocked,
  hasDeliveryZone,
  placing,
  checkoutSubmissionToken,
  personalDataConsent,
  onPersonalDataConsentChange,
  onBottomAction,
  onPay,
  showCartFivePercentOffer = false,
  onApplyCartFivePercent,
  showCartSocialNudge = false,
  onDismissCartSocialNudge,
  customerName,
  countryCode,
  phoneNational,
  customerEmail,
}: {
  lang: Locale;
  items: CartItem[];
  delivery: DeliveryFormValues;
  onDeliveryChange: (v: DeliveryFormValues) => void;
  checkoutDeliveryProfile: CheckoutDeliveryProfile;
  recipientName: string;
  onRecipientNameChange: (v: string) => void;
  recipientCountryCode: string;
  onRecipientCountryCodeChange: (v: string) => void;
  recipientPhoneNational: string;
  onRecipientPhoneNationalChange: (v: string) => void;
  surpriseDelivery: boolean;
  onSurpriseDeliveryChange: (v: boolean) => void;
  orderingForSomeoneElse: boolean;
  onOrderingForSomeoneElseChange: (v: boolean) => void;
  cardMessage: string;
  onCardMessageChange: (v: string) => void;
  noCardMessage: boolean;
  onNoCardMessageChange: (v: boolean) => void;
  senderFields: ReactNode;
  phoneCountryPopular: CountryCodeEntry[];
  phoneCountryAll: CountryCodeEntry[];
  itemsTotal: number;
  bouquetSubtotal: number;
  addOnsTotal: number;
  otherItemsSubtotal: number;
  deliveryFee: number;
  deliveryFeeGross?: number;
  discount: number;
  discountLabel: string;
  grandTotal: number;
  mayCampaignProgressRemaining: number;
  appliedReferralCode: string | null;
  storedReferralCode: string | null;
  referralIneligibleReason?: import('@/lib/promo/lannaBloomCoupon').LannaBloomIneligibleReason | 'not_eligible' | null;
  hasCatalogProductDiscount?: boolean;
  onReferralChange: () => void;
  mayCampaignEligible: boolean;
  highlightSection: CheckoutSectionId | null;
  highlightMapsLink?: boolean;
  sectionRefs: Record<CheckoutSectionId, React.RefObject<HTMLElement | null>>;
  onRemoveItem: (index: number) => void;
  onChangeItemQuantity: (index: number, quantity: number) => void;
  isPaymentUnlocked: boolean;
  hasDeliveryZone: boolean;
  placing: boolean;
  checkoutSubmissionToken: string | null;
  personalDataConsent: boolean;
  onPersonalDataConsentChange: (checked: boolean) => void;
  onBottomAction: () => void;
  onPay: () => void;
  showCartFivePercentOffer?: boolean;
  onApplyCartFivePercent?: () => void;
  showCartSocialNudge?: boolean;
  onDismissCartSocialNudge?: () => void;
  customerName: string;
  countryCode: string;
  phoneNational: string;
  customerEmail: string;
}) {
  const t = translations[lang].cart;
  const tPremium = translations[lang].premiumCheckout;

  const DISCOUNT_BTN_EXIT_MS = 280;
  const SOCIAL_NUDGE_DELAY_MS = 400;

  type DiscountBtnPhase = 'visible' | 'exiting' | 'hidden';
  const [discountBtnPhase, setDiscountBtnPhase] = useState<DiscountBtnPhase>(() =>
    showCartFivePercentOffer ? 'visible' : 'hidden'
  );
  const [socialNudgeOpen, setSocialNudgeOpen] = useState(false);
  const discountExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socialNudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showCartFivePercentOffer && discountBtnPhase === 'hidden') {
      setDiscountBtnPhase('visible');
      setSocialNudgeOpen(false);
    }
  }, [showCartFivePercentOffer, discountBtnPhase]);

  useEffect(() => {
    if (!showCartSocialNudge) {
      setSocialNudgeOpen(false);
      return;
    }
    socialNudgeTimerRef.current = setTimeout(() => {
      setSocialNudgeOpen(true);
    }, SOCIAL_NUDGE_DELAY_MS);
    return () => {
      if (socialNudgeTimerRef.current) clearTimeout(socialNudgeTimerRef.current);
    };
  }, [showCartSocialNudge]);

  useEffect(
    () => () => {
      if (discountExitTimerRef.current) clearTimeout(discountExitTimerRef.current);
      if (socialNudgeTimerRef.current) clearTimeout(socialNudgeTimerRef.current);
    },
    []
  );

  const handleDiscountClick = () => {
    if (discountBtnPhase !== 'visible' || !onApplyCartFivePercent) return;
    setDiscountBtnPhase('exiting');
    discountExitTimerRef.current = setTimeout(() => {
      onApplyCartFivePercent();
      setDiscountBtnPhase('hidden');
    }, DISCOUNT_BTN_EXIT_MS);
  };

  const showDiscountButton =
    onApplyCartFivePercent &&
    (discountBtnPhase === 'visible' || discountBtnPhase === 'exiting');
  const payButtonSolo = discountBtnPhase === 'hidden';

  const payButtonDisabled =
    placing || !checkoutSubmissionToken || !personalDataConsent;
  const payButtonMuted = !isPaymentUnlocked || !hasDeliveryZone;

  const deliveryScheduleLine = formatCheckoutStickySchedule(
    delivery,
    lang,
    tPremium.todayTile,
    tPremium.tomorrowTile
  );
  const stickyItemSummary = buildStickyItemSummary(items, lang);
  const stickyHasToyItem = hasToyItemInCart(items);

  const { setPayload: setCheckoutStickyHeader } = useCheckoutStickyHeader();
  const onBottomActionRef = useRef(onBottomAction);
  onBottomActionRef.current = onBottomAction;

  useEffect(() => {
    setCheckoutStickyHeader({
      total: grandTotal,
      itemSummary: stickyItemSummary,
      hasToyItem: stickyHasToyItem,
      deliveryScheduleLine,
      deliveryFee,
      deliveryFeeGross,
      deliveryFeeKnown: hasDeliveryZone,
      deliveryFeeLabel: t.deliveryFeeLabel,
      deliveryFreeLabel: tPremium.freeDelivery,
      deliveryPendingLabel: t.stickyDeliverySelectArea ?? 'Select area',
      policyHint: t.stickyPolicyApplies,
      policyDeliveryLabel: t.policyDeliveryLink,
      policyRefundLabel: t.policyRefundLink,
      giftMessageLabel: t.stickyGiftMessageOptional,
      securePaymentLabel: translations[lang].trustBadges.securePayments,
      deliveryPolicyHref: `/${lang}/info/delivery-policy`,
      refundPolicyHref: `/${lang}/refund-replacement`,
      readyToPay: isPaymentUnlocked,
      loading: placing,
      disabled: !checkoutSubmissionToken || (isPaymentUnlocked && !personalDataConsent),
      onAction: () => onBottomActionRef.current(),
      continueLabel: tPremium.continueBtn,
      payNowLabel: tPremium.payNowBtn,
    });
    return () => setCheckoutStickyHeader(null);
  }, [
    grandTotal,
    isPaymentUnlocked,
    placing,
    checkoutSubmissionToken,
    personalDataConsent,
    stickyItemSummary,
    stickyHasToyItem,
    deliveryScheduleLine,
    deliveryFee,
    deliveryFeeGross,
    hasDeliveryZone,
    t.deliveryFeeLabel,
    t.stickyDeliverySelectArea,
    t.stickyPolicyApplies,
    t.stickyGiftMessageOptional,
    t.policyDeliveryLink,
    t.policyRefundLink,
    translations,
    lang,
    tPremium.continueBtn,
    tPremium.payNowBtn,
    tPremium.freeDelivery,
    setCheckoutStickyHeader,
  ]);

  return (
    <>
      <PremiumCheckoutFlow
        lang={lang}
        items={items}
        delivery={delivery}
        onDeliveryChange={onDeliveryChange}
        deliveryProfile={checkoutDeliveryProfile}
        recipientName={recipientName}
        onRecipientNameChange={onRecipientNameChange}
        recipientCountryCode={recipientCountryCode}
        onRecipientCountryCodeChange={onRecipientCountryCodeChange}
        recipientPhoneNational={recipientPhoneNational}
        onRecipientPhoneNationalChange={onRecipientPhoneNationalChange}
        surpriseDelivery={surpriseDelivery}
        onSurpriseDeliveryChange={onSurpriseDeliveryChange}
        orderingForSomeoneElse={orderingForSomeoneElse}
        onOrderingForSomeoneElseChange={onOrderingForSomeoneElseChange}
        cardMessage={cardMessage}
        onCardMessageChange={onCardMessageChange}
        noCardMessage={noCardMessage}
        onNoCardMessageChange={onNoCardMessageChange}
        senderFields={senderFields}
        phoneCountryPopular={phoneCountryPopular}
        phoneCountryAll={phoneCountryAll}
        itemsTotal={itemsTotal}
        bouquetSubtotal={bouquetSubtotal}
        addOnsTotal={addOnsTotal}
        otherItemsSubtotal={otherItemsSubtotal}
        deliveryFee={deliveryFee}
        deliveryFeeGross={deliveryFeeGross}
        discount={discount}
        discountLabel={discountLabel}
        grandTotal={grandTotal}
        mayCampaignProgressRemaining={mayCampaignProgressRemaining}
        appliedReferralCode={appliedReferralCode}
        storedReferralCode={storedReferralCode}
        referralIneligibleReason={referralIneligibleReason}
        hasCatalogProductDiscount={hasCatalogProductDiscount}
        onReferralChange={onReferralChange}
        mayCampaignEligible={mayCampaignEligible}
        highlightSection={highlightSection}
        highlightMapsLink={highlightMapsLink}
        sectionRefs={sectionRefs}
        onRemoveItem={onRemoveItem}
        onChangeItemQuantity={onChangeItemQuantity}
        customerName={customerName}
        countryCode={countryCode}
        phoneNational={phoneNational}
        customerEmail={customerEmail}
        paymentSection={
          <div className="co-payment-block">
            <label
              className="co-personal-data-consent"
              htmlFor="checkout-personal-data-consent"
            >
              <input
                id="checkout-personal-data-consent"
                type="checkbox"
                checked={personalDataConsent}
                onChange={(e) => onPersonalDataConsentChange(e.target.checked)}
                className="co-personal-data-consent-input"
              />
              <span>
                {t.personalDataConsentBefore}{' '}
                <Link href={`/${lang}/privacy`} className="co-personal-data-consent-link">
                  {t.personalDataConsentLink}
                </Link>
              </span>
            </label>
            <div className="co-payment-row">
              <button
                type="button"
                className={[
                  'co-payment-btn',
                  payButtonMuted ? 'co-payment-btn--muted' : '',
                  payButtonSolo ? 'co-payment-btn--solo' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={onPay}
                disabled={payButtonDisabled}
                aria-busy={placing}
              >
                {placing ? t.creatingCheckout : tPremium.paySecurely}
              </button>
              {showDiscountButton && (
                <div
                  className={[
                    'co-discount-btn-wrap',
                    discountBtnPhase === 'exiting' ? 'co-discount-btn-wrap--exit' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className={[
                      'co-discount-btn',
                      discountBtnPhase === 'exiting' ? 'co-discount-btn--exit' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={handleDiscountClick}
                    disabled={placing || discountBtnPhase === 'exiting'}
                  >
                    {t.cartFivePercentBtn ?? 'I want 5% off'}
                  </button>
                </div>
              )}
            </div>
            <OverlayReveal
              open={socialNudgeOpen}
              className="co-social-nudge-reveal"
              hiddenWhenClosed
            >
              <div className="co-social-nudge" role="status">
                <p className="co-social-nudge-title">
                  {t.cartFivePercentSocialTitle ??
                    'Discount applied! Follow us for new bouquets and offers.'}
                </p>
                <div className="co-social-nudge-actions">
                  <SocialLinks />
                  {onDismissCartSocialNudge && (
                    <button
                      type="button"
                      className="co-social-nudge-later"
                      onClick={onDismissCartSocialNudge}
                    >
                      {t.cartFivePercentSocialLater ?? 'Maybe later'}
                    </button>
                  )}
                </div>
              </div>
            </OverlayReveal>
            <style jsx>{`
              .co-payment-block {
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 4px 0 8px;
              }
              .co-personal-data-consent {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                margin: 0 0 4px;
                font-size: 12px;
                line-height: 1.4;
                color: var(--text-muted);
                cursor: pointer;
              }
              .co-personal-data-consent-input {
                margin: 2px 0 0;
                flex-shrink: 0;
                width: 15px;
                height: 15px;
                accent-color: var(--primary);
              }
              .co-personal-data-consent-link {
                color: var(--primary);
                font-weight: 600;
                text-decoration: none;
              }
              .co-personal-data-consent-link:hover {
                text-decoration: underline;
              }
              .co-payment-row {
                display: flex;
                gap: 10px;
                align-items: stretch;
              }
              .co-discount-btn-wrap {
                flex: 0 0 auto;
                overflow: hidden;
                max-width: 12rem;
                transition:
                  max-width 0.28s var(--ui-overlay-ease, ease),
                  opacity 0.28s var(--ui-overlay-ease, ease),
                  margin 0.28s var(--ui-overlay-ease, ease);
              }
              .co-discount-btn-wrap--exit {
                max-width: 0;
                opacity: 0;
                margin-left: -10px;
              }
              .co-discount-btn {
                position: relative;
                overflow: hidden;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 48px;
                padding: 0 14px;
                border: 1px solid color-mix(in srgb, var(--accent-border, #a88b5c) 70%, transparent);
                border-radius: 12px;
                background: linear-gradient(
                  135deg,
                  var(--accent-secondary, #e6be8a) 0%,
                  var(--accent, #c5a059) 100%
                );
                color: var(--accent-cta-text, #1a3c34);
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.02em;
                line-height: 1.2;
                font-family: inherit;
                white-space: nowrap;
                cursor: pointer;
                opacity: 1;
                transform: scale(1);
                box-shadow:
                  inset 0 1px 0 rgba(255, 255, 255, 0.45),
                  0 2px 8px color-mix(in srgb, var(--accent, #c5a059) 40%, transparent);
                transition:
                  box-shadow 0.2s ease,
                  filter 0.2s ease,
                  opacity 0.28s var(--ui-overlay-ease, ease),
                  transform 0.28s var(--ui-overlay-ease, ease);
              }
              .co-discount-btn::after {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(
                  115deg,
                  transparent 30%,
                  rgba(255, 255, 255, 0.55) 50%,
                  transparent 70%
                );
                transform: translateX(-100%);
                animation: co-discount-shimmer 3.2s ease-in-out infinite;
                pointer-events: none;
              }
              @keyframes co-discount-shimmer {
                0%,
                60% {
                  transform: translateX(-100%);
                }
                100% {
                  transform: translateX(100%);
                }
              }
              .co-discount-btn--exit {
                opacity: 0;
                transform: scale(0.92);
              }
              .co-discount-btn:hover:not(:disabled) {
                transform: translateY(-1px);
                filter: brightness(1.04);
                box-shadow:
                  inset 0 1px 0 rgba(255, 255, 255, 0.5),
                  0 4px 14px color-mix(in srgb, var(--accent, #c5a059) 55%, transparent);
              }
              .co-discount-btn:active:not(:disabled) {
                transform: translateY(0);
                filter: brightness(0.98);
                box-shadow:
                  inset 0 1px 0 rgba(255, 255, 255, 0.35),
                  0 1px 4px color-mix(in srgb, var(--accent, #c5a059) 35%, transparent);
              }
              .co-discount-btn:disabled {
                cursor: not-allowed;
              }
              .co-discount-btn-wrap--exit .co-discount-btn:disabled {
                opacity: 0;
              }
              .co-payment-btn {
                flex: 1 1 0;
                min-width: 0;
                min-height: 48px;
                border: none;
                border-radius: 12px;
                background: var(--primary);
                color: #fff;
                font-size: 16px;
                font-weight: 600;
                font-family: inherit;
                cursor: pointer;
                transition: flex 0.3s var(--ui-overlay-ease, ease);
              }
              .co-payment-btn--solo {
                width: 100%;
                flex: 1 1 100%;
              }
              .co-payment-btn:disabled {
                opacity: 0.55;
                cursor: not-allowed;
              }
              .co-payment-btn--muted:not(:disabled) {
                opacity: 0.72;
              }
              .co-social-nudge-reveal:global(.ui-overlay-reveal--open) {
                margin-top: 4px;
              }
              .co-social-nudge {
                padding: 12px 14px;
                border-radius: 12px;
                background: var(--pastel-cream, #faf6f0);
                border: 1px solid var(--border, #e8e0d8);
              }
              .co-social-nudge-title {
                margin: 0 0 10px;
                font-size: 13px;
                line-height: 1.45;
                color: var(--text);
              }
              .co-social-nudge-actions {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 10px 14px;
              }
              .co-social-nudge-later {
                margin-left: auto;
                padding: 0;
                border: none;
                background: transparent;
                color: var(--text-muted);
                font-size: 12px;
                font-family: inherit;
                text-decoration: underline;
                text-underline-offset: 2px;
                cursor: pointer;
              }
              .co-social-nudge-later:hover {
                color: var(--text);
              }
              @media (max-width: 380px) {
                .co-payment-row {
                  flex-direction: column;
                  align-items: stretch;
                }
                .co-discount-btn-wrap {
                  align-self: flex-end;
                  max-width: 100%;
                }
                .co-discount-btn-wrap--exit {
                  max-width: 0;
                  margin-left: 0;
                  align-self: flex-end;
                }
                .co-discount-btn {
                  min-height: 52px;
                }
                .co-payment-btn {
                  min-height: 52px;
                }
              }
              @media (prefers-reduced-motion: reduce) {
                .co-discount-btn-wrap,
                .co-discount-btn,
                .co-payment-btn {
                  transition: none;
                }
                .co-discount-btn::after {
                  animation: none;
                }
                .co-discount-btn-wrap--exit {
                  max-width: 0;
                  opacity: 0;
                  margin-left: 0;
                }
                .co-discount-btn--exit {
                  transform: none;
                }
              }
            `}</style>
          </div>
        }
      />
      <CheckoutBottomAction
        lang={lang}
        deliveryScheduleLine={deliveryScheduleLine}
        total={grandTotal}
        deliveryFee={deliveryFee}
        deliveryFeeGross={deliveryFeeGross}
        deliveryFeeKnown={hasDeliveryZone}
        readyToPay={isPaymentUnlocked}
        loading={placing}
        disabled={
          !checkoutSubmissionToken || (isPaymentUnlocked && !personalDataConsent)
        }
        onAction={onBottomAction}
        labels={{
          continue: tPremium.continueBtn,
          payNow: tPremium.payNowBtn,
          deliveryFeeLabel: t.deliveryFeeLabel,
          deliveryFree: tPremium.freeDelivery,
          deliveryFeePending: t.stickyDeliverySelectArea ?? 'Select area',
          policyBefore: t.policyConsentBefore,
          policyDelivery: t.policyDeliveryLink,
          policyBetween: t.policyConsentBetween,
          policyRefund: t.policyRefundLink,
        }}
      />
    </>
  );
}
