'use client';

import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { CartItem } from '@/contexts/CartContext';
import type { DeliveryFormValues } from '@/components/DeliveryForm';
import { PremiumCheckoutFlow } from '@/components/checkout/premium/PremiumCheckoutFlow';
import { CheckoutBottomAction } from '@/components/checkout/CheckoutBottomAction';
import type { CheckoutDeliveryProfile } from '@/hooks/useCheckoutDeliveryProfile';
import type { CheckoutSectionId } from '@/lib/checkout/premiumCheckoutValidation';
import { getPaymentAvailability } from '@/lib/checkout/paymentAvailability';

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
            <p className="co-payment-helper">{tPremium.paymentHelper}</p>
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
              .co-payment-helper {
                margin: 0;
                font-size: 14px;
                color: var(--text-muted);
                line-height: 1.4;
              }
            `}</style>
          </div>
        }
      />
      <CheckoutBottomAction
        lang={lang}
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
