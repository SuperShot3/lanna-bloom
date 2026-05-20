'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { Locale } from '@/lib/i18n';
import { useCheckoutStickyHeader } from '@/contexts/CheckoutStickyHeaderContext';
import { translations } from '@/lib/i18n';
import type { CartItem } from '@/contexts/CartContext';
import {
  isDeliveryTimeSlotSelectableForDate,
  type DeliveryFormValues,
} from '@/components/DeliveryForm';
import { PremiumCheckoutFlow } from '@/components/checkout/premium/PremiumCheckoutFlow';
import { CheckoutBottomAction } from '@/components/checkout/CheckoutBottomAction';
import type { CheckoutDeliveryProfile } from '@/hooks/useCheckoutDeliveryProfile';
import type { CheckoutSectionId } from '@/lib/checkout/premiumCheckoutValidation';
import { getPaymentAvailability } from '@/lib/checkout/paymentAvailability';
import { getLocalTodayYmd, getLocalTomorrowYmd } from '@/lib/localDateYmd';

function formatCheckoutStickySchedule(
  delivery: DeliveryFormValues,
  lang: Locale,
  todayLabel: string,
  tomorrowLabel: string
): string | null {
  const { date, timeSlot } = delivery;
  if (!date || !timeSlot) return null;
  if (!isDeliveryTimeSlotSelectableForDate(date, timeSlot)) return null;

  const todayStr = getLocalTodayYmd();
  const tomorrowStr = getLocalTomorrowYmd();
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
  deliveryNotes,
  onDeliveryNotesChange,
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
  countryCodeOptions,
  itemsTotal,
  addOnsTotal,
  deliveryFee,
  deliveryFeeGross,
  discount,
  discountLabel,
  grandTotal,
  mayCampaignProgressRemaining,
  appliedReferralCode,
  onReferralChange,
  mayCampaignEligible,
  highlightSection,
  sectionRefs,
  onRemoveItem,
  onChangeItemQuantity,
  orderError,
  isPaymentUnlocked,
  hasDeliveryZone,
  placing,
  checkoutSubmissionToken,
  onBottomAction,
  onPay,
}: {
  lang: Locale;
  items: CartItem[];
  delivery: DeliveryFormValues;
  onDeliveryChange: (v: DeliveryFormValues) => void;
  deliveryNotes: string;
  onDeliveryNotesChange: (v: string) => void;
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
  countryCodeOptions: ReactNode;
  itemsTotal: number;
  addOnsTotal: number;
  deliveryFee: number;
  deliveryFeeGross?: number;
  discount: number;
  discountLabel: string;
  grandTotal: number;
  mayCampaignProgressRemaining: number;
  appliedReferralCode: string | null;
  onReferralChange: () => void;
  mayCampaignEligible: boolean;
  highlightSection: CheckoutSectionId | null;
  sectionRefs: Record<CheckoutSectionId, React.RefObject<HTMLElement | null>>;
  onRemoveItem: (index: number) => void;
  onChangeItemQuantity: (index: number, quantity: number) => void;
  orderError: string | null;
  isPaymentUnlocked: boolean;
  hasDeliveryZone: boolean;
  placing: boolean;
  checkoutSubmissionToken: string | null;
  onBottomAction: () => void;
  onPay: () => void;
}) {
  const t = translations[lang].cart;
  const tPremium = translations[lang].premiumCheckout;
  const preparingCheckout = t.preparingCheckout;

  const paymentAvailabilityBase = getPaymentAvailability({
    hasDeliveryDistrict: hasDeliveryZone,
    isFormValid: isPaymentUnlocked,
    isLoading: placing,
    firstIncompleteHint: undefined,
    messages: {
      selectDeliveryArea: t.selectDeliveryAreaPayment,
      processing: t.processing,
    },
  });
  const paymentAvailability =
    checkoutSubmissionToken && items.length > 0
      ? paymentAvailabilityBase
      : { stripe: { enabled: false, reason: preparingCheckout } };

  const checkoutDisabled = !paymentAvailability.stripe.enabled || placing;

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
      disabled: !checkoutSubmissionToken,
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
        deliveryNotes={deliveryNotes}
        onDeliveryNotesChange={onDeliveryNotesChange}
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
        countryCodeOptions={countryCodeOptions}
        itemsTotal={itemsTotal}
        addOnsTotal={addOnsTotal}
        deliveryFee={deliveryFee}
        deliveryFeeGross={deliveryFeeGross}
        discount={discount}
        discountLabel={discountLabel}
        grandTotal={grandTotal}
        mayCampaignProgressRemaining={mayCampaignProgressRemaining}
        appliedReferralCode={appliedReferralCode}
        onReferralChange={onReferralChange}
        mayCampaignEligible={mayCampaignEligible}
        highlightSection={highlightSection}
        sectionRefs={sectionRefs}
        onRemoveItem={onRemoveItem}
        onChangeItemQuantity={onChangeItemQuantity}
        inlineError={orderError}
        paymentSection={
          <div className="co-payment-block">
            <h2 className="co-payment-title">{tPremium.paymentTitle}</h2>
            <button
              type="button"
              className="co-payment-btn"
              onClick={onPay}
              disabled={checkoutDisabled}
              aria-busy={placing}
            >
              {placing ? t.creatingCheckout : tPremium.paySecurely}
            </button>
            <style jsx>{`
              .co-payment-block {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 4px 0 8px;
              }
              .co-payment-title {
                font-size: 17px;
                font-weight: 600;
                margin: 0;
              }
              .co-payment-btn {
                width: 100%;
                min-height: 52px;
                border: none;
                border-radius: 14px;
                background: var(--primary);
                color: #fff;
                font-size: 17px;
                font-weight: 600;
                font-family: inherit;
                cursor: pointer;
              }
              .co-payment-btn:disabled {
                opacity: 0.55;
                cursor: not-allowed;
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
        disabled={!checkoutSubmissionToken}
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
