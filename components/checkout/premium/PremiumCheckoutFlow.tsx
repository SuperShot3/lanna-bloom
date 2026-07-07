'use client';

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import Image from 'next/image';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { CartItem } from '@/contexts/CartContext';
import { useCart } from '@/contexts/CartContext';
import type { DeliveryFormValues } from '@/components/DeliveryForm';
import { DeliveryTimeSelector } from '@/components/checkout/DeliveryTimeSelector';
import { DeliveryAddressFields } from '@/components/checkout/DeliveryAddressFields';
import { PhoneCountrySelect } from '@/components/checkout/PhoneCountrySelect';
import type { CountryCodeEntry } from '@/lib/checkout/phoneCountryDial';
import { DeliveryDateSelector } from '@/components/checkout/DeliveryDateSelector';
import { SameDayCutoffBanner } from '@/components/checkout/SameDayCutoffBanner';
import { SelectionTile, SuggestionChip } from '@/components/checkout/premium/SelectionTile';
import { RecipientOptInToggle } from '@/components/checkout/premium/RecipientOptInToggle';
import { ReferralCodeBox } from '@/components/ReferralCodeBox';
import { TrustBadges } from '@/components/TrustBadges';
import { getZonesForDestination, getZoneFee } from '@/lib/delivery/zones';
import type { CheckoutDeliveryProfile } from '@/hooks/useCheckoutDeliveryProfile';
import type { CheckoutSectionId } from '@/lib/checkout/premiumCheckoutValidation';
import { isNonBouquetCartLine } from '@/lib/cart/cartPriceBreakdown';
import {
  getWrappingPaperColorLabel,
  isSpecificWrappingPaperColor,
} from '@/lib/wrappingPaperColors';
import { applyExpansionItemMarkupThb } from '@/lib/expansionMarkup';
import { getAddOnsTotal } from '@/lib/addonsConfig';
import { formatThb } from '@/lib/costsUtils';
import {
  CHECKOUT_FIELD_LIMITS,
  clipCheckoutField,
} from '@/lib/checkout/checkoutFieldLimits';
import { DeliveryLocationRequestModal } from '@/components/checkout/DeliveryLocationRequestModal';

function formatDestinationLabel(
  profile: CheckoutDeliveryProfile,
  lang: Locale
): string {
  return lang === 'th' ? profile.labels.th : profile.labels.en;
}

function primaryBouquetIndex(items: CartItem[]): number {
  return items.findIndex((i) => (i.itemType ?? 'bouquet') === 'bouquet');
}

export type PremiumCheckoutFlowProps = {
  lang: Locale;
  items: CartItem[];
  delivery: DeliveryFormValues;
  onDeliveryChange: (v: DeliveryFormValues) => void;
  deliveryProfile: CheckoutDeliveryProfile;
  recipientName: string;
  onRecipientNameChange: (v: string) => void;
  recipientCountryCode: string;
  onRecipientCountryCodeChange: (v: string) => void;
  recipientPhoneNational: string;
  onRecipientPhoneNationalChange: (v: string) => void;
  surpriseDelivery: boolean;
  onSurpriseDeliveryChange: (v: boolean) => void;
  /** When true, recipient name/phone fields are shown and required. */
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
  onReferralChange: () => void;
  mayCampaignEligible: boolean;
  highlightSection: CheckoutSectionId | null;
  highlightMapsLink?: boolean;
  sectionRefs: Record<CheckoutSectionId, React.RefObject<HTMLElement | null>>;
  onRemoveItem: (index: number) => void;
  onChangeItemQuantity: (index: number, quantity: number) => void;
  paymentSection: ReactNode;
  customerName: string;
  countryCode: string;
  phoneNational: string;
  customerEmail: string;
};

export function PremiumCheckoutFlow(props: PremiumCheckoutFlowProps) {
  const {
    lang,
    items,
    delivery,
    onDeliveryChange,
    deliveryProfile,
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
    itemsTotal,
    bouquetSubtotal,
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
    highlightMapsLink = false,
    sectionRefs,
    onRemoveItem,
    onChangeItemQuantity,
    paymentSection,
    customerName,
    countryCode,
    phoneNational,
    customerEmail,
  } = props;

  const { hydrated } = useCart();
  const t = translations[lang].premiumCheckout;
  const tCart = translations[lang].cart;
  const tBuyNow = translations[lang].buyNow;
  const [cardMessageOpen, setCardMessageOpen] = useState(false);
  const [giftMessageChipsOpen, setGiftMessageChipsOpen] = useState(true);
  const [giftMessageDraft, setGiftMessageDraft] = useState(cardMessage);
  const [locationRequestOpen, setLocationRequestOpen] = useState(false);
  const locationRequestTriggerRef = useRef<HTMLButtonElement>(null);
  const giftMessageFocusedRef = useRef(false);
  const giftMessageTouchStartY = useRef<number | null>(null);
  const zones = getZonesForDestination(delivery.deliveryDestination);
  const destLabel = formatDestinationLabel(deliveryProfile, lang);
  const hasGiftMessage = !noCardMessage && cardMessage.trim().length > 0;
  const giftMessageChipLabel = noCardMessage
    ? t.noCardMessage
    : hasGiftMessage
      ? (t.giftMessageComplete ?? 'Message added')
      : t.giftMessageTitle;
  const giftMessageChipActive =
    cardMessageOpen || noCardMessage || cardMessage.trim().length > 0;

  const hideGiftChipsIfHasText = () => {
    if (!noCardMessage && giftMessageDraft.trim()) {
      setGiftMessageChipsOpen(false);
    }
  };

  const syncGiftMessageDraft = (value: string) => {
    setGiftMessageDraft(value);
    onCardMessageChange(value);
  };

  const applyGiftChip = (text: string) => {
    onNoCardMessageChange(false);
    syncGiftMessageDraft(clipCheckoutField(text, 'giftCardMessage'));
    setGiftMessageChipsOpen(false);
  };

  const clearGiftMessage = () => {
    onNoCardMessageChange(false);
    syncGiftMessageDraft('');
    setGiftMessageChipsOpen(true);
  };

  useEffect(() => {
    if (!giftMessageFocusedRef.current) {
      setGiftMessageDraft(cardMessage);
    }
  }, [cardMessage]);

  useEffect(() => {
    if (cardMessageOpen) {
      setGiftMessageChipsOpen(true);
      if (!giftMessageFocusedRef.current) {
        setGiftMessageDraft(cardMessage);
      }
    }
  }, [cardMessageOpen, cardMessage]);

  const handleGiftMessageTouchStart = (e: TouchEvent) => {
    if (giftMessageFocusedRef.current) return;
    giftMessageTouchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const handleGiftMessageTouchMove = (e: TouchEvent) => {
    if (giftMessageFocusedRef.current || giftMessageTouchStartY.current == null) return;
    const y = e.touches[0]?.clientY;
    if (y == null) return;
    if (y - giftMessageTouchStartY.current > 36) {
      hideGiftChipsIfHasText();
      giftMessageTouchStartY.current = null;
    }
  };

  const handleGiftMessageTouchEnd = () => {
    giftMessageTouchStartY.current = null;
  };

  const selectNoCardMessage = () => {
    onNoCardMessageChange(true);
    syncGiftMessageDraft('');
    setCardMessageOpen(false);
  };

  const sectionClass = (id: CheckoutSectionId) =>
    `co-section${highlightSection === id ? ' co-section--highlight' : ''}`;
  const sectionRef = (id: CheckoutSectionId) =>
    sectionRefs[id] as React.Ref<HTMLElement>;

  return (
    <div className="premium-checkout">
      <header className="co-hero">
        <h1 className="co-hero__title">{t.pageTitle}</h1>
        <p className="co-hero__sub">{t.pageSubtitle}</p>
      </header>

      <section
        ref={sectionRef('product')}
        data-checkout-section="product"
        className={sectionClass('product')}
      >
        <div className="co-card">
          {!hydrated ? (
            <>
              <div className="co-product-row co-product-row--skeleton" aria-hidden>
                <div className="co-product-row__img co-product-row__img--ph" />
                <div className="co-product-row__main">
                  <span className="co-skeleton-line co-skeleton-line--title" />
                  <span className="co-skeleton-line co-skeleton-line--meta" />
                  <span className="co-skeleton-line co-skeleton-line--meta co-skeleton-line--short" />
                </div>
              </div>
            </>
          ) : null}
          {hydrated
            ? items.map((item, index) => {
            const name = lang === 'th' ? item.nameTh : item.nameEn;
            const qty = item.quantity ?? 1;
            const unit =
              item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {});
            const display = applyExpansionItemMarkupThb(unit, delivery.deliveryDestination) * qty;
            const addOnSummaryLines: string[] = [];
            const balloonText =
              item.itemType === 'balloon' ? item.addOns?.balloonText?.trim() : '';
            if (balloonText) {
              addOnSummaryLines.push(
                `${tCart.balloonTextLabel ?? 'Balloon text'}: "${balloonText}"`
              );
            }
            if (
              (item.itemType ?? 'bouquet') === 'bouquet' &&
              isSpecificWrappingPaperColor(item.addOns?.paperColor)
            ) {
              addOnSummaryLines.push(
                `${tCart.wrappingPaperLabel ?? 'Wrapping paper'}: ${getWrappingPaperColorLabel(item.addOns.paperColor, lang)}`
              );
            }
            return (
              <div key={`${item.bouquetId}-${index}`} className="co-product-row">
                {item.imageUrl ? (
                  <div className="co-product-row__img">
                    <Image src={item.imageUrl} alt="" width={88} height={88} sizes="88px" className="co-product-row__photo" />
                  </div>
                ) : (
                  <div className="co-product-row__img co-product-row__img--ph" aria-hidden />
                )}
                <div className="co-product-row__main">
                  <span className="co-product-row__name">{name}</span>
                  <span className="co-product-row__meta">
                    {item.size.label} · {'\u0E3F'}
                    {display.toLocaleString()}
                  </span>
                  {addOnSummaryLines.map((line) => (
                    <span key={line} className="co-product-row__addon-note">
                      {line}
                    </span>
                  ))}
                  <span className="co-product-row__dest">
                    {destLabel} {t.deliveryRegionLabel}
                  </span>
                  <div className="co-qty-stepper" role="group" aria-label={tCart.quantity}>
                    <button
                      type="button"
                      className="co-qty-stepper__btn"
                      onClick={() => onChangeItemQuantity(index, qty - 1)}
                      aria-label={tCart.decreaseQuantity}
                    >
                      −
                    </button>
                    <span className="co-qty-stepper__value" aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="co-qty-stepper__btn"
                      onClick={() => onChangeItemQuantity(index, qty + 1)}
                      aria-label={tCart.increaseQuantity}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="co-product-row__actions">
                  <button
                    type="button"
                    className="co-product-row__remove"
                    onClick={() => onRemoveItem(index)}
                    aria-label={tCart.remove}
                  >
                    {tCart.remove}
                  </button>
                </div>
              </div>
            );
          })
            : null}
        </div>
      </section>

      <section
        ref={sectionRef('delivery')}
        data-checkout-section="delivery"
        className={sectionClass('delivery')}
      >
        <h2 className="co-section-title">{t.whereDeliverTitle}</h2>
        <div className="co-card co-card--pad">
          {deliveryProfile.variant === 'expansion' && (
            <div className="co-field">
              <label className="co-label">{lang === 'th' ? 'พื้นที่จัดส่ง' : 'Delivery area'}</label>
              <input type="text" readOnly className="co-input" value={destLabel} />
            </div>
          )}
          <div className="co-field">
            <label className="co-label" htmlFor="checkout-zone">
              {tBuyNow.districtLabel} <span className="co-req">*</span>
            </label>
            <div className="co-zone-control">
              <select
                id="checkout-zone"
                className="co-input"
                value={delivery.deliveryZoneId}
                onChange={(e) =>
                  onDeliveryChange({ ...delivery, deliveryZoneId: e.target.value })
                }
              >
                <option value="">{tBuyNow.selectDistrict}</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {lang === 'th' ? z.labelTh : z.labelEn} — {'\u0E3F'}
                    {(getZoneFee(delivery.deliveryDestination, z.id) ?? z.feeThb).toLocaleString()}
                  </option>
                ))}
              </select>
              <button
                type="button"
                ref={locationRequestTriggerRef}
                className="co-location-request-link"
                onClick={() => setLocationRequestOpen(true)}
              >
                {(tCart as { deliveryLocationCta?: string }).deliveryLocationCta ??
                  "Can't find your area?"}
              </button>
            </div>
          </div>
          <DeliveryAddressFields
            lang={lang}
            value={delivery}
            onChange={onDeliveryChange}
            inputId="checkout-delivery-address"
            highlight={highlightSection === 'delivery'}
            highlightMapsLink={highlightMapsLink}
            labels={{
              addressLabel: tBuyNow.addressLabel,
              addressPlaceholder: t.addressPlaceholder,
              deliveryNoteLabel: t.deliveryNoteForDriverLabel,
              deliveryNotePlaceholder: t.deliveryNoteForDriverPlaceholder,
              deliveryNoteHint: t.deliveryNoteForDriverHint,
              googleMapsLinkPlaceholder: tBuyNow.googleMapsLinkPlaceholder,
              googleMapsLinkHint: tBuyNow.googleMapsLinkHint,
              openGoogleMapsAriaLabel: tBuyNow.openGoogleMapsButton,
            }}
          />
        </div>
      </section>

      <section
        ref={sectionRef('deliveryDate')}
        data-checkout-section="deliveryDate"
        className={sectionClass('deliveryDate')}
      >
        <h2 className="co-section-title">{t.deliveryDateTitle}</h2>
        {deliveryProfile.variant === 'chiang-mai' && <SameDayCutoffBanner lang={lang} />}
        <DeliveryDateSelector
          lang={lang}
          value={delivery.date}
          onChange={(ymd) => onDeliveryChange({ ...delivery, date: ymd })}
          pickerClassName="co-delivery-date-picker"
        />
      </section>

      <section
        ref={sectionRef('deliveryTime')}
        data-checkout-section="deliveryTime"
        className={sectionClass('deliveryTime')}
      >
        <h2 className="co-section-title">{t.deliveryTimeTitle}</h2>
        <DeliveryTimeSelector
          lang={lang}
          date={delivery.date}
          timeSlot={delivery.timeSlot}
          deliveryTimeMode={delivery.deliveryTimeMode}
          onChange={(timeSlot, deliveryTimeMode) =>
            onDeliveryChange({ ...delivery, timeSlot, deliveryTimeMode })
          }
        />
      </section>

      <section
        ref={sectionRef('sender')}
        data-checkout-section="sender"
        className={sectionClass('sender')}
      >
        <h2 className="co-section-title">{t.senderTitle}</h2>
        <div className="co-card co-sender">{senderFields}</div>
      </section>

      <section
        ref={sectionRef('recipient')}
        data-checkout-section="recipient"
        className={sectionClass('recipient')}
      >
        <div className="co-opt-in-chip-row">
          <RecipientOptInToggle
            showReveal={false}
            selected={orderingForSomeoneElse}
            onSelectedChange={(next) => {
              onOrderingForSomeoneElseChange(next);
              if (!next) onSurpriseDeliveryChange(false);
            }}
            toggleLabel={t.recipientDetailsToggle}
          />
          {primaryBouquetIndex(items) >= 0 && (
            <RecipientOptInToggle
              showReveal={false}
              selected={cardMessageOpen}
              onSelectedChange={setCardMessageOpen}
              toggleLabel={giftMessageChipLabel}
              chipActive={giftMessageChipActive}
              chipComplete={hasGiftMessage}
            />
          )}
        </div>
        <RecipientOptInToggle
          showChip={false}
          selected={orderingForSomeoneElse}
          onSelectedChange={(next) => {
            onOrderingForSomeoneElseChange(next);
            if (!next) onSurpriseDeliveryChange(false);
          }}
          toggleLabel={t.recipientDetailsToggle}
        >
          <div className="co-card co-card--pad co-recipient-fields">
            <h3 className="co-subsection-title">{t.recipientDetailsSectionTitle}</h3>
            <div className="co-field">
              <label className="co-label" htmlFor="co-recipient-name">
                {tCart.recipientName} <span className="co-req">*</span>
              </label>
              <input
                id="co-recipient-name"
                className="co-input"
                value={recipientName}
                onChange={(e) =>
                  onRecipientNameChange(
                    clipCheckoutField(e.target.value, 'recipientName')
                  )
                }
                autoComplete="name"
                maxLength={CHECKOUT_FIELD_LIMITS.recipientName}
              />
            </div>
            <div className="co-field">
              <label className="co-label" htmlFor="co-recipient-phone">
                {tCart.recipientPhone} <span className="co-req">*</span>
              </label>
              <div className="co-phone-row">
                <PhoneCountrySelect
                  value={recipientCountryCode}
                  onChange={onRecipientCountryCodeChange}
                  popular={props.phoneCountryPopular}
                  all={props.phoneCountryAll}
                  lang={lang}
                  ariaLabel={tCart.countryCode}
                />
                <input
                  id="co-recipient-phone"
                  type="tel"
                  inputMode="numeric"
                  className="co-input co-phone-num"
                  value={recipientPhoneNational}
                  onChange={(e) =>
                    onRecipientPhoneNationalChange(
                      e.target.value
                        .replace(/\D/g, '')
                        .slice(0, CHECKOUT_FIELD_LIMITS.recipientPhoneNational)
                    )
                  }
                  autoComplete="tel-national"
                  maxLength={CHECKOUT_FIELD_LIMITS.recipientPhoneNational}
                />
              </div>
            </div>
            <label className="co-surprise">
              <input
                type="checkbox"
                checked={surpriseDelivery}
                onChange={(e) => onSurpriseDeliveryChange(e.target.checked)}
              />
              <span>{t.surpriseToggle}</span>
            </label>
            <p className="co-hint">{t.surpriseHelper}</p>
          </div>
        </RecipientOptInToggle>
        {primaryBouquetIndex(items) >= 0 && (
          <RecipientOptInToggle
            showChip={false}
            selected={cardMessageOpen}
            onSelectedChange={setCardMessageOpen}
            toggleLabel={giftMessageChipLabel}
            chipActive={giftMessageChipActive}
            chipComplete={hasGiftMessage}
          >
            <div
              className="co-card co-card--pad co-gift-message-card"
              onTouchStart={handleGiftMessageTouchStart}
              onTouchMove={handleGiftMessageTouchMove}
              onTouchEnd={handleGiftMessageTouchEnd}
              onTouchCancel={handleGiftMessageTouchEnd}
            >
              <textarea
                className="co-input co-textarea"
                rows={3}
                value={noCardMessage ? '' : giftMessageDraft}
                disabled={noCardMessage}
                onChange={(e) => {
                  onNoCardMessageChange(false);
                  syncGiftMessageDraft(
                    clipCheckoutField(e.target.value, 'giftCardMessage')
                  );
                }}
                maxLength={CHECKOUT_FIELD_LIMITS.giftCardMessage}
                onBlur={() => {
                  giftMessageFocusedRef.current = false;
                  hideGiftChipsIfHasText();
                }}
                onFocus={() => {
                  giftMessageFocusedRef.current = true;
                  if (!giftMessageChipsOpen) {
                    setGiftMessageChipsOpen(true);
                  }
                }}
                placeholder={t.giftMessagePlaceholder}
                aria-label={t.giftMessageTitle}
              />
              <div
                className={`co-gift-chips-reveal${
                  giftMessageChipsOpen ? ' co-gift-chips-reveal--open' : ''
                }`}
                aria-hidden={!giftMessageChipsOpen}
              >
                <div className="co-gift-chips-reveal-inner">
                  <div className="co-chips co-chips--gift-message">
                    {[
                      t.giftChipBirthday,
                      t.giftChipLove,
                      t.giftChipThanks,
                      t.giftChipCongrats,
                      t.giftChipThinking,
                    ].map((chip) => (
                      <SuggestionChip
                        key={chip}
                        label={chip}
                        onClick={() => applyGiftChip(chip)}
                      />
                    ))}
                    <SuggestionChip label={t.noCardMessage} onClick={selectNoCardMessage} />
                    <button
                      type="button"
                      className="co-clear-btn co-clear-btn--chip"
                      onClick={clearGiftMessage}
                      disabled={!noCardMessage && !giftMessageDraft.trim()}
                    >
                      {t.clearGiftMessage}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </RecipientOptInToggle>
        )}
      </section>

      <section className="co-section co-price-section">
        <div className="co-card co-card--pad">
          {bouquetSubtotal > 0 && (
            <div className="co-price-row">
              <span>{t.bouquetSubtotal}</span>
              <span>{formatThb(bouquetSubtotal)}</span>
            </div>
          )}
          {addOnsTotal > 0 && (
            <div className="co-price-row">
              <span>{t.addonsSubtotal}</span>
              <span>{formatThb(addOnsTotal)}</span>
            </div>
          )}
          {items.map((item, index) => {
            if (!isNonBouquetCartLine(item)) return null;
            const name = lang === 'th' ? item.nameTh : item.nameEn;
            const qty = item.quantity ?? 1;
            const unit =
              item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {});
            const lineTotal =
              applyExpansionItemMarkupThb(unit, delivery.deliveryDestination) * qty;
            if (lineTotal <= 0) return null;
            return (
              <div key={`other-item-${index}`} className="co-price-row">
                <span>
                  {name}
                  {qty > 1 ? ` × ${qty}` : ''}
                </span>
                <span>{formatThb(lineTotal)}</span>
              </div>
            );
          })}
          <div className="co-price-row">
            <span>{t.deliveryLine}</span>
            <span>
              {deliveryFeeGross != null && deliveryFeeGross > deliveryFee ? (
                <>
                  <s className="co-price-was">{formatThb(deliveryFeeGross)}</s>{' '}
                  {t.freeDelivery}
                </>
              ) : (
                formatThb(deliveryFee)
              )}
            </span>
          </div>
          {discount > 0 && (
            <div className="co-price-row co-price-row--discount">
              <span>{discountLabel}</span>
              <span>-{formatThb(discount)}</span>
            </div>
          )}
          <div className="co-price-row co-price-row--total">
            <span>{t.totalLine}</span>
            <span>{formatThb(grandTotal)}</span>
          </div>
          {mayCampaignProgressRemaining > 0 && !appliedReferralCode && (
            <p className="co-hint" role="status">
              {(tCart.mayFreeDeliveryProgressHint ?? '').replace(
                '{amount}',
                mayCampaignProgressRemaining.toLocaleString()
              )}
            </p>
          )}
          <ReferralCodeBox
            lang={lang}
            subtotal={itemsTotal + deliveryFee}
            itemSubtotal={itemsTotal}
            deliveryFee={deliveryFee}
            deliveryDestination={delivery.deliveryDestination}
            appliedCode={appliedReferralCode}
            onApply={onReferralChange}
            onRemove={onReferralChange}
            mayCampaignEligible={mayCampaignEligible}
          />
        </div>
      </section>

      <section ref={sectionRef('payment')} data-checkout-section="payment" className="co-section">
        {paymentSection}
      </section>

      <TrustBadges lang={lang} />

      <style jsx global>{`
        /* Sender fields are rendered from CartPageClient (not scoped to this component). */
        .premium-checkout .co-sender-fields .co-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .premium-checkout .co-sender-fields .co-label,
        .premium-checkout .co-sender-fields .co-contact-prefs legend.co-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .premium-checkout .co-sender-fields .co-req {
          color: var(--accent);
        }
        .premium-checkout .co-sender-fields .co-input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 16px;
          font-family: inherit;
          box-sizing: border-box;
          background: #fff;
          color: var(--text);
        }
        .premium-checkout .co-sender-fields .co-input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .premium-checkout .co-sender-fields .co-phone-row {
          display: flex;
          align-items: stretch;
          gap: 0;
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
        }
        .premium-checkout .co-sender-fields .co-phone-row:focus-within {
          border-color: var(--accent);
        }
        .premium-checkout .co-sender-fields .co-phone-row .co-input.co-phone-num {
          flex: 1;
          min-width: 0;
          width: auto;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none;
        }
        .premium-checkout .co-sender-fields {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          margin: 0;
        }
        .premium-checkout .co-sender-phone-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .premium-checkout .co-contact-prefs {
          margin: 0;
          padding: 0;
          border: none;
          min-width: 0;
        }
        .premium-checkout .co-contact-prefs legend {
          margin-bottom: 6px;
          padding: 0;
          display: block;
          width: 100%;
        }
        .premium-checkout .co-sender-fields .co-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 0;
        }
        .premium-checkout .co-sender-fields .cart-contact-chip {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 2px solid var(--border);
          background: color-mix(in srgb, var(--pastel-cream) 80%, #fff);
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
          cursor: pointer;
          box-sizing: border-box;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s, color 0.15s;
        }
        .premium-checkout .co-sender-fields .cart-contact-chip:hover {
          border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
          background: var(--pastel-cream);
        }
        .premium-checkout .co-sender-fields .cart-contact-chip-selected {
          border-color: var(--checkout-option-selected-border);
          background: var(--checkout-option-selected-bg);
          box-shadow: var(--checkout-option-selected-ring);
          color: var(--primary);
        }
        .premium-checkout .co-sender-fields .cart-contact-chip-input {
          position: absolute;
          width: 1px;
          height: 1px;
          margin: -1px;
          padding: 0;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
          opacity: 0;
          pointer-events: none;
        }
        .premium-checkout .co-sender-fields .cart-contact-chip-box {
          flex-shrink: 0;
          position: relative;
          display: block;
          width: 16px;
          height: 16px;
          border: 1.5px solid var(--border);
          border-radius: 4px;
          background: #fff;
          box-sizing: border-box;
          transition: border-color 0.15s, background 0.15s;
        }
        .premium-checkout .co-sender-fields .cart-contact-chip-selected .cart-contact-chip-box {
          border-color: var(--accent);
          background: var(--accent);
        }
        .premium-checkout .co-sender-fields .cart-contact-chip-selected .cart-contact-chip-box::after {
          content: '✓';
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .premium-checkout .co-sender-fields .cart-contact-chip-label {
          line-height: 1.2;
        }
        .premium-checkout .co-sender-fields .cart-phone-hint {
          font-size: 13px;
          line-height: 1.4;
          margin: 4px 0 0;
        }
        .premium-checkout .co-sender-fields .cart-phone-hint--neutral {
          color: var(--text-muted);
        }
        .premium-checkout .co-sender-fields .cart-phone-hint--tip {
          color: #b45309;
        }
        .premium-checkout .co-sender-fields .cart-phone-hint--warn {
          color: #b91c1c;
        }
        .premium-checkout .co-sender-fields p.cart-field-hint {
          font-size: 13px;
          line-height: 1.4;
          color: var(--text-muted);
          margin: 4px 0 0;
        }
        .premium-checkout .co-sender-fields p.cart-line-id-error {
          color: #b91c1c;
        }
        .premium-checkout .co-sender-fields label.cart-marketing-consent {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 14px;
          line-height: 1.4;
          color: var(--text-muted);
          cursor: pointer;
        }
        .premium-checkout .co-sender-fields .cart-marketing-consent-input {
          margin-top: 3px;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          accent-color: var(--accent);
        }
        .premium-checkout .co-card.co-sender {
          padding: 16px;
        }
      `}</style>
      <style jsx>{`
        .premium-checkout {
          max-width: 560px;
          margin: 0 auto;
          padding: 8px 16px calc(92px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        @media (min-width: 900px) {
          .premium-checkout {
            padding-bottom: 24px;
          }
        }
        .co-hero__title {
          font-family: var(--font-serif);
          font-size: clamp(1.5rem, 5vw, 1.85rem);
          font-weight: 500;
          line-height: 1.2;
          margin: 0 0 8px;
          color: var(--text);
        }
        .co-hero__sub {
          margin: 0;
          font-size: 16px;
          line-height: 1.45;
          color: var(--text-muted);
        }
        .co-section-title {
          font-size: 17px;
          font-weight: 600;
          margin: 0 0 12px;
          color: var(--text);
        }
        .co-section-heading-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .co-section-title--inline {
          margin: 0;
        }
        .co-clear-btn {
          border: none;
          background: none;
          padding: 6px 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--primary);
          cursor: pointer;
          font-family: inherit;
          border-radius: 8px;
        }
        .co-clear-btn:hover:not(:disabled) {
          background: color-mix(in srgb, var(--pastel-mint) 50%, transparent);
        }
        .co-clear-btn:disabled {
          opacity: 0.45;
          cursor: default;
        }
        .co-gift-chips-reveal {
          display: grid;
          grid-template-rows: 0fr;
          width: 100%;
          opacity: 0;
          margin-top: 0;
          transition:
            grid-template-rows 0.44s cubic-bezier(0.25, 0.46, 0.45, 0.94),
            opacity 0.36s ease-out,
            margin-top 0.36s ease-out;
        }
        .co-gift-chips-reveal--open {
          grid-template-rows: 1fr;
          opacity: 1;
          margin-top: 12px;
        }
        .co-gift-chips-reveal-inner {
          overflow: hidden;
          min-height: 0;
        }
        .co-chips--gift-message {
          margin-top: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .co-gift-chips-reveal {
            transition: none;
          }
          .co-gift-chips-reveal--open {
            margin-top: 12px;
          }
        }
        .co-clear-btn--chip {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--pastel-cream) 80%, #fff);
          color: var(--text-muted);
          font-weight: 500;
          transition:
            border-color 0.2s ease-out,
            background 0.2s ease-out,
            color 0.2s ease-out;
        }
        .co-clear-btn--chip:not(:disabled) {
          color: var(--primary);
          font-weight: 600;
          border-color: color-mix(in srgb, var(--primary) 28%, var(--border));
          background: color-mix(in srgb, var(--pastel-mint) 50%, #fff);
        }
        .co-clear-btn--chip:hover:not(:disabled) {
          border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
          background: var(--pastel-mint);
          color: var(--primary);
        }
        .co-section--highlight {
          animation: co-highlight 1.2s ease;
        }
        @keyframes co-highlight {
          0%,
          100% {
            box-shadow: none;
          }
          30% {
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-soft) 80%, transparent);
            border-radius: 16px;
          }
        }
        .co-card {
          background: #fff;
          border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(26, 60, 52, 0.04);
        }
        .co-card--pad {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow: visible;
        }
        .co-section {
          overflow: visible;
        }
        .co-product-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }
        .co-product-row + .co-product-row {
          border-top: 1px solid var(--border);
        }
        .co-product-row__img {
          width: 88px;
          height: 88px;
          border-radius: 14px;
          overflow: hidden;
          flex-shrink: 0;
          background: var(--pastel-cream);
        }
        .co-product-row__img :global(.co-product-row__photo) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .co-product-row__img--ph {
          background: var(--pastel-cream);
        }
        .co-product-row__main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .co-product-row__name {
          font-size: 15px;
          font-weight: 600;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .co-product-row--skeleton .co-product-row__main {
          gap: 8px;
        }
        .co-skeleton-line {
          display: block;
          height: 14px;
          border-radius: 6px;
          background: linear-gradient(
            90deg,
            var(--pastel-cream) 25%,
            color-mix(in srgb, var(--pastel-cream) 60%, #fff) 50%,
            var(--pastel-cream) 75%
          );
          background-size: 200% 100%;
          animation: co-skeleton-pulse 1.4s ease-in-out infinite;
        }
        .co-skeleton-line--title {
          height: 16px;
          width: 72%;
        }
        .co-skeleton-line--meta {
          width: 55%;
        }
        .co-skeleton-line--short {
          width: 40%;
        }
        @keyframes co-skeleton-pulse {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }
        @media (max-width: 390px) {
          .co-product-row {
            flex-wrap: wrap;
            align-items: flex-start;
          }
          .co-product-row__img {
            width: 72px;
            height: 72px;
          }
          .co-product-row__actions {
            width: 100%;
            flex-direction: row;
            justify-content: flex-end;
            align-items: center;
            padding-left: 84px;
          }
          .co-product-row__remove {
            padding: 6px 10px;
            font-size: 12px;
          }
        }
        .co-product-row__meta,
        .co-product-row__dest,
        .co-product-row__addon-note {
          font-size: 13px;
          color: var(--text-muted);
        }
        .co-product-row__addon-note {
          display: block;
          margin-top: 2px;
        }
        .co-qty-stepper {
          display: inline-flex;
          align-items: center;
          gap: 0;
          margin-top: 8px;
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
          width: fit-content;
        }
        .co-qty-stepper__btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 34px;
          padding: 0;
          border: none;
          background: var(--pastel-cream);
          color: var(--text);
          font-size: 18px;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s;
        }
        .co-qty-stepper__btn:hover {
          background: color-mix(in srgb, var(--pastel-mint) 50%, var(--pastel-cream));
        }
        .co-qty-stepper__btn:active {
          background: color-mix(in srgb, var(--pastel-mint) 70%, var(--pastel-cream));
        }
        .co-qty-stepper__value {
          min-width: 32px;
          padding: 0 6px;
          text-align: center;
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          border-left: 1px solid var(--border);
          border-right: 1px solid var(--border);
          line-height: 34px;
        }
        .co-product-row__actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          flex-shrink: 0;
        }
        .co-product-row__remove {
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.2s, color 0.2s;
        }
        .co-product-row__remove:hover {
          border-color: var(--accent);
          color: var(--text);
        }
        .co-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .co-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .co-req {
          color: var(--accent);
        }
        .co-input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 16px;
          font-family: inherit;
          box-sizing: border-box;
          background: #fff;
        }
        .co-textarea {
          min-height: 88px;
          resize: vertical;
        }
        .co-tile-grid {
          display: grid;
          gap: 10px;
        }
        .co-tile-grid--2 {
          grid-template-columns: 1fr 1fr;
        }
        .co-tile-grid--time {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .co-tile-grid--3 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          align-items: stretch;
        }
        @media (max-width: 400px) {
          .co-tile-grid--3 {
            grid-template-columns: 1fr;
          }
          .co-tile-grid--time {
            grid-template-columns: 1fr;
          }
        }
        :global(.co-tile--disabled) {
          opacity: 0.45;
          pointer-events: none;
        }
        :global(.co-delivery-date-picker) {
          max-width: 100%;
        }
        .co-phone-row {
          display: flex;
          gap: 0;
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }
        .co-phone-cc {
          border: none;
          padding: 12px 8px;
          font-size: 14px;
          background: var(--pastel-cream);
          max-width: 38%;
        }
        :global(.co-phone-cc--flag-only) {
          width: 76px;
          min-width: 76px;
          max-width: 76px;
          padding: 12px 8px;
          font-size: 22px;
          line-height: 1;
          text-align: center;
          flex-shrink: 0;
          height: auto;
          border-radius: 0;
          gap: 2px;
        }
        :global(.co-phone-cc--trigger-full) {
          width: auto;
          min-width: 5.75rem;
          max-width: 9rem;
          font-size: 0.95rem;
          font-weight: 600;
          justify-content: space-between;
        }
        :global(.co-phone-cc--trigger-full .co-phone-cc__trigger-text) {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        :global(.co-phone-cc__chevron) {
          flex-shrink: 0;
          opacity: 0.55;
        }
        :global(.co-phone-cc--trigger-flag .co-phone-cc__chevron) {
          width: 12px;
          height: 12px;
        }
        :global(.co-phone-cc-menu__item--selected) {
          font-weight: 600;
          background: color-mix(in srgb, var(--accent) 12%, transparent);
        }
        .co-phone-num {
          border: none !important;
          border-radius: 0 !important;
        }
        .co-surprise {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
        }
        .co-surprise input {
          width: 18px;
          height: 18px;
        }
        .co-hint {
          margin: 0;
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .co-subsection-title {
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 4px;
          color: var(--text);
        }
        .co-recipient-fields {
          margin-top: 0;
        }
        .co-opt-in-chip-row {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 4px;
        }
        .co-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .co-price-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 15px;
          padding: 6px 0;
        }
        .co-price-row > span:first-child {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .co-price-row > span:last-child {
          flex-shrink: 0;
        }
        .co-price-row--total {
          font-size: 18px;
          font-weight: 700;
          padding-top: 12px;
          margin-top: 4px;
          border-top: 1px solid var(--border);
        }
        .co-price-row--discount {
          color: var(--primary);
        }
        .co-price-was {
          opacity: 0.55;
          margin-right: 4px;
        }
        .co-zone-control {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .co-location-request-link {
          align-self: flex-start;
          margin: 0;
          padding: 0 0 0 14px;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.4;
          color: var(--accent);
          text-decoration: none;
          text-align: left;
          cursor: pointer;
        }
        .co-location-request-link:hover {
          color: color-mix(in srgb, var(--accent) 75%, var(--primary));
        }
        .co-location-request-link:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
      <DeliveryLocationRequestModal
        lang={lang}
        isOpen={locationRequestOpen}
        onClose={() => setLocationRequestOpen(false)}
        items={items}
        customerName={customerName}
        countryCode={countryCode}
        phoneNational={phoneNational}
        customerEmail={customerEmail}
        triggerRef={locationRequestTriggerRef}
      />
    </div>
  );
}
