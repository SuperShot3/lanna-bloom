'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { CartItem } from '@/contexts/CartContext';
import type { DeliveryFormValues } from '@/components/DeliveryForm';
import {
  DELIVERY_TIME_SLOTS,
  isDeliveryTimeSlotSelectableForDate,
} from '@/components/DeliveryForm';
import { DeliveryAddressAutocomplete } from '@/components/checkout/DeliveryAddressAutocomplete';
import { PhoneCountrySelect } from '@/components/checkout/PhoneCountrySelect';
import { SelectionTile, SuggestionChip } from '@/components/checkout/premium/SelectionTile';
import { ReferralCodeBox } from '@/components/ReferralCodeBox';
import { TrustBadges } from '@/components/TrustBadges';
import { getZonesForDestination, getZoneFee } from '@/lib/delivery/zones';
import { getLocalTodayYmd, getLocalTomorrowYmd } from '@/lib/localDateYmd';
import type { CheckoutDeliveryProfile } from '@/hooks/useCheckoutDeliveryProfile';
import type { CheckoutSectionId } from '@/lib/checkout/premiumCheckoutValidation';
import { applyExpansionItemMarkupThb } from '@/lib/expansionMarkup';
import { getAddOnsTotal } from '@/lib/addonsConfig';
import { formatThb } from '@/lib/costsUtils';
const CARD_MESSAGE_MAX = 250;

const MORNING_SLOT = DELIVERY_TIME_SLOTS[0];
const AFTERNOON_SLOT = DELIVERY_TIME_SLOTS[2];

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
  deliveryNotes: string;
  onDeliveryNotesChange: (v: string) => void;
  deliveryProfile: CheckoutDeliveryProfile;
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
  inlineError?: string | null;
  paymentSection: ReactNode;
};

export function PremiumCheckoutFlow(props: PremiumCheckoutFlowProps) {
  const {
    lang,
    items,
    delivery,
    onDeliveryChange,
    deliveryNotes,
    onDeliveryNotesChange,
    deliveryProfile,
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
    inlineError,
    paymentSection,
  } = props;

  const t = translations[lang].premiumCheckout;
  const tCart = translations[lang].cart;
  const tBuyNow = translations[lang].buyNow;
  const [dateMode, setDateMode] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const todayStr = getLocalTodayYmd();
  const tomorrowStr = getLocalTomorrowYmd();
  const zones = getZonesForDestination(delivery.deliveryDestination);
  const destLabel = formatDestinationLabel(deliveryProfile, lang);
  const biasChiangMai = deliveryProfile.variant === 'chiang-mai';

  const morningOk =
    !delivery.date || isDeliveryTimeSlotSelectableForDate(delivery.date, MORNING_SLOT);
  const afternoonOk =
    !delivery.date || isDeliveryTimeSlotSelectableForDate(delivery.date, AFTERNOON_SLOT);

  const appendNote = (text: string) => {
    const cur = deliveryNotes.trim();
    if (!cur) onDeliveryNotesChange(text);
    else if (!cur.toLowerCase().includes(text.toLowerCase())) {
      onDeliveryNotesChange(`${cur}. ${text}`);
    }
  };

  const applyGiftChip = (text: string) => {
    onNoCardMessageChange(false);
    onCardMessageChange(text);
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
          {items.map((item, index) => {
            const name = lang === 'th' ? item.nameTh : item.nameEn;
            const qty = item.quantity ?? 1;
            const unit =
              item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {});
            const display = applyExpansionItemMarkupThb(unit, delivery.deliveryDestination) * qty;
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
                    {item.size.label}
                    {qty > 1 ? ` × ${qty}` : ''} · {'\u0E3F'}
                    {display.toLocaleString()}
                  </span>
                  <span className="co-product-row__dest">
                    {destLabel} {t.deliveryRegionLabel}
                  </span>
                </div>
                <div className="co-product-row__actions">
                  <Link href={`/${lang}/catalog`} className="co-product-row__edit">
                    {t.changeLink}
                  </Link>
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
          })}
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
              <label className="co-label">{lang === 'th' ? 'à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¸ˆà¸±à¸”à¸ªà¹ˆà¸‡' : 'Delivery area'}</label>
              <input type="text" readOnly className="co-input" value={destLabel} />
            </div>
          )}
          <div className="co-field">
            <label className="co-label" htmlFor="checkout-zone">
              {tBuyNow.districtLabel} <span className="co-req">*</span>
            </label>
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
          </div>
          <DeliveryAddressAutocomplete
            lang={lang}
            value={delivery}
            onChange={onDeliveryChange}
            biasChiangMai={biasChiangMai}
            highlight={highlightSection === 'delivery'}
            labels={{
              searchPlaceholder: t.addressSearchPlaceholder,
              confirmedChange: t.addressChange,
              manualFallbackLabel: t.addressManualToggle,
              manualFallbackPlaceholder: t.addressManualPlaceholder,
              mapsLinkPlaceholder: t.addressMapsPlaceholder,
              addressUncertain: t.addressUncertain,
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
        <div className="co-tile-grid co-tile-grid--3">
          <SelectionTile
            selected={delivery.date === todayStr && dateMode !== 'custom'}
            title={t.todayTile}
            subtitle={t.todaySub}
            onClick={() => {
              setDateMode('today');
              onDeliveryChange({ ...delivery, date: todayStr });
            }}
          />
          <SelectionTile
            selected={delivery.date === tomorrowStr && dateMode !== 'custom'}
            title={t.tomorrowTile}
            subtitle={t.tomorrowSub}
            onClick={() => {
              setDateMode('tomorrow');
              onDeliveryChange({ ...delivery, date: tomorrowStr });
            }}
          />
          <SelectionTile
            selected={dateMode === 'custom'}
            title={t.chooseDateTile}
            subtitle={t.chooseDateSub}
            onClick={() => {
              setDateMode('custom');
              dateInputRef.current?.showPicker?.();
            }}
          />
        </div>
        {dateMode === 'custom' && (
          <input
            ref={dateInputRef}
            type="date"
            className="co-input co-date-hidden"
            min={todayStr}
            value={delivery.date}
            onChange={(e) => onDeliveryChange({ ...delivery, date: e.target.value })}
            aria-label={t.chooseDateTile}
          />
        )}
      </section>

      <section
        ref={sectionRef('deliveryTime')}
        data-checkout-section="deliveryTime"
        className={sectionClass('deliveryTime')}
      >
        <h2 className="co-section-title">{t.deliveryTimeTitle}</h2>
        <div className="co-tile-grid co-tile-grid--2">
          <SelectionTile
            selected={delivery.timeSlot === MORNING_SLOT}
            title={t.morningTile}
            subtitle={t.morningSub}
            onClick={() => morningOk && onDeliveryChange({ ...delivery, timeSlot: MORNING_SLOT })}
            className={!morningOk ? 'co-tile--disabled' : ''}
          />
          <SelectionTile
            selected={delivery.timeSlot === AFTERNOON_SLOT}
            title={t.afternoonTile}
            subtitle={t.afternoonSub}
            onClick={() =>
              afternoonOk && onDeliveryChange({ ...delivery, timeSlot: AFTERNOON_SLOT })
            }
            className={!afternoonOk ? 'co-tile--disabled' : ''}
          />
        </div>
      </section>

      <section
        ref={sectionRef('recipient')}
        data-checkout-section="recipient"
        className={sectionClass('recipient')}
      >
        <h2 className="co-section-title">{t.recipientTitle}</h2>
        <div className="co-card co-card--pad">
          <div className="co-field">
            <label className="co-label" htmlFor="co-recipient-name">
              {tCart.recipientName} <span className="co-req">*</span>
            </label>
            <input
              id="co-recipient-name"
              className="co-input"
              value={recipientName}
              onChange={(e) => onRecipientNameChange(e.target.value)}
              autoComplete="name"
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
                options={props.countryCodeOptions}
                ariaLabel={tCart.countryCode}
              />
              <input
                id="co-recipient-phone"
                type="tel"
                inputMode="numeric"
                className="co-input co-phone-num"
                value={recipientPhoneNational}
                onChange={(e) =>
                  onRecipientPhoneNationalChange(e.target.value.replace(/\D/g, '').slice(0, 15))
                }
                autoComplete="tel-national"
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
      </section>

      {primaryBouquetIndex(items) >= 0 && (
        <section className="co-section">
          <h2 className="co-section-title">{t.giftMessageTitle}</h2>
          <div className="co-card co-card--pad">
            <textarea
              className="co-input co-textarea"
              rows={3}
              value={noCardMessage ? '' : cardMessage}
              disabled={noCardMessage}
              onChange={(e) => onCardMessageChange(e.target.value.slice(0, CARD_MESSAGE_MAX))}
              placeholder={t.giftMessagePlaceholder}
            />
            <div className="co-chips">
              {[
                t.giftChipBirthday,
                t.giftChipLove,
                t.giftChipThanks,
                t.giftChipCongrats,
                t.giftChipThinking,
              ].map((chip) => (
                <SuggestionChip key={chip} label={chip} onClick={() => applyGiftChip(chip)} />
              ))}
              <SuggestionChip
                label={t.noCardMessage}
                onClick={() => {
                  onNoCardMessageChange(true);
                  onCardMessageChange('');
                }}
              />
            </div>
          </div>
        </section>
      )}

      <section className="co-section">
        <div className="co-section-heading-row">
          <h2 className="co-section-title co-section-title--inline">{t.deliveryNotesTitle}</h2>
          {deliveryNotes.trim().length > 0 && (
            <button
              type="button"
              className="co-clear-btn"
              onClick={() => onDeliveryNotesChange('')}
            >
              {t.clearDeliveryNotes}
            </button>
          )}
        </div>
        <div className="co-card co-card--pad">
          <input
            className="co-input"
            value={deliveryNotes}
            onChange={(e) => onDeliveryNotesChange(e.target.value.slice(0, 300))}
            placeholder={t.deliveryNotesPlaceholder}
          />
          <div className="co-chips">
            <SuggestionChip label={t.noteChipReception} onClick={() => appendNote(t.noteChipReception)} />
            <SuggestionChip label={t.noteChipCallBefore} onClick={() => appendNote(t.noteChipCallBefore)} />
            <SuggestionChip
              label={t.noteChipNoCallRecipient}
              onClick={() => appendNote(t.noteChipNoCallRecipient)}
            />
            <SuggestionChip label={t.noteChipSurprise} onClick={() => appendNote(t.noteChipSurprise)} />
          </div>
        </div>
      </section>

      <section
        ref={sectionRef('sender')}
        data-checkout-section="sender"
        className={sectionClass('sender')}
      >
        <h2 className="co-section-title">{t.senderTitle}</h2>
        <div className="co-card co-sender">{senderFields}</div>
      </section>


      <section className="co-section co-price-section">
        <div className="co-card co-card--pad">
          <div className="co-price-row">
            <span>{t.bouquetSubtotal}</span>
            <span>{formatThb(itemsTotal)}</span>
          </div>
          {addOnsTotal > 0 && (
            <div className="co-price-row">
              <span>{t.addonsSubtotal}</span>
              <span>{formatThb(addOnsTotal)}</span>
            </div>
          )}
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

      {inlineError && (
        <p className="co-inline-error" role="alert">
          {inlineError}
        </p>
      )}

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
          float: left;
          width: 100%;
        }
        .premium-checkout .co-sender-fields .co-chips {
          clear: both;
        }
        .premium-checkout .co-sender-fields .cart-contact-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--pastel-cream) 80%, #fff);
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .premium-checkout .co-sender-fields .cart-contact-chip:hover {
          border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
          background: var(--pastel-cream);
        }
        .premium-checkout .co-sender-fields .cart-contact-chip-selected {
          border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
          background: color-mix(in srgb, var(--pastel-mint) 35%, #fff);
          color: var(--primary);
        }
        .premium-checkout .co-sender-fields .cart-contact-chip-box {
          width: 16px;
          height: 16px;
          border-radius: 4px;
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
          padding: 8px 16px 120px;
          display: flex;
          flex-direction: column;
          gap: 28px;
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
        .co-clear-btn:hover {
          background: color-mix(in srgb, var(--pastel-mint) 50%, transparent);
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
        }
        .co-product-row__meta,
        .co-product-row__dest {
          font-size: 13px;
          color: var(--text-muted);
        }
        .co-product-row__actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          flex-shrink: 0;
        }
        .co-product-row__edit {
          font-size: 13px;
          font-weight: 600;
          color: var(--primary);
          text-decoration: none;
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
        .co-tile-grid--3 {
          grid-template-columns: repeat(3, 1fr);
        }
        @media (max-width: 400px) {
          .co-tile-grid--3 {
            grid-template-columns: 1fr;
          }
        }
        :global(.co-tile--disabled) {
          opacity: 0.45;
          pointer-events: none;
        }
        .co-date-hidden {
          margin-top: 10px;
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
          width: 58px;
          min-width: 58px;
          max-width: 58px;
          padding: 12px 6px;
          font-size: 22px;
          line-height: 1;
          text-align: center;
          flex-shrink: 0;
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
        .co-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .co-price-row {
          display: flex;
          justify-content: space-between;
          font-size: 15px;
          padding: 6px 0;
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
        .co-inline-error {
          margin: 0;
          padding: 12px 14px;
          border-radius: 12px;
          background: #fef2f2;
          color: #991b1b;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
