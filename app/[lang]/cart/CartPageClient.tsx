'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { DeliveryForm, type DeliveryFormValues } from '@/components/DeliveryForm';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type {
  OrderPayload,
  OrderWrappingOption,
  OrderCardType,
  ContactPreferenceOption,
} from '@/lib/orders';
import { CARD_BEAUTIFUL_PRICE_THB } from '@/components/AddOnsSection';
import type { CartItem } from '@/contexts/CartContext';

function buildAddOnsSummaryForDisplay(
  addOns: CartItem['addOns'],
  t: Record<string, string | number>
): string {
  const lines: string[] = [];
  if (addOns.cardType === 'beautiful') {
    lines.push(String(t.addOnsSummaryCardBeautiful));
  } else if (addOns.cardType === 'free') {
    lines.push(String(t.addOnsSummaryCard).replace('{label}', String(t.cardFree)));
  }
  if (addOns.wrappingPreference === 'classic') {
    lines.push(String(t.addOnsSummaryWrapping).replace('{label}', String(t.wrappingClassic)));
  } else if (addOns.wrappingPreference === 'premium') {
    lines.push(String(t.addOnsSummaryWrapping).replace('{label}', String(t.wrappingPremium)));
  } else if (addOns.wrappingPreference === 'none') {
    lines.push(String(t.addOnsSummaryWrapping).replace('{label}', String(t.wrappingNone)));
  }
  if (addOns.cardMessage.trim()) {
    lines.push(String(t.addOnsSummaryMessage).replace('{text}', addOns.cardMessage.trim()));
  }
  return lines.join('. ');
}

function mapWrappingToOption(
  pref: CartItem['addOns']['wrappingPreference']
): OrderWrappingOption {
  if (pref === 'classic') return 'standard';
  if (pref === 'premium') return 'premium';
  if (pref === 'none') return 'no paper';
  return null;
}

function mapCardType(addOns: CartItem['addOns']): OrderCardType {
  if (addOns.cardType === 'free') return 'free';
  if (addOns.cardType === 'beautiful') return 'premium';
  return null;
}

const CONTACT_OPTIONS: ContactPreferenceOption[] = ['phone', 'line', 'whatsapp', 'telegram'];

const PHONE_MIN_DIGITS = 8;
const PHONE_MAX_DIGITS = 15;

/** Flag + code only (same for all locales). */
const COUNTRY_CODES: { code: string; label: string }[] = [
  { code: '66', label: '🇹🇭 (+66)' },
  { code: '95', label: '🇲🇲 (+95)' },
  { code: '856', label: '🇱🇦 (+856)' },
  { code: '855', label: '🇰🇭 (+855)' },
  { code: '84', label: '🇻🇳 (+84)' },
  { code: '60', label: '🇲🇾 (+60)' },
  { code: '65', label: '🇸🇬 (+65)' },
  { code: '62', label: '🇮🇩 (+62)' },
  { code: '63', label: '🇵🇭 (+63)' },
  { code: '1', label: '🇺🇸 (+1)' },
  { code: '44', label: '🇬🇧 (+44)' },
  { code: '81', label: '🇯🇵 (+81)' },
];

function buildOrderPayload(
  cartItems: CartItem[],
  delivery: DeliveryFormValues,
  lang: Locale,
  contact: { customerName: string; phone: string; contactPreference: ContactPreferenceOption[] }
): OrderPayload {
  const deliveryAddress =
    delivery.district && lang === 'th'
      ? `เชียงใหม่ ${delivery.district.nameTh}`
      : delivery.district
        ? `Chiang Mai, ${delivery.district.nameEn}`
        : '';
  const preferredTimeSlot = delivery.date
    ? `${delivery.date} (${delivery.deliveryType})`
    : delivery.deliveryType;

  const orderItems = cartItems.map((item) => {
    const bouquetTitle = lang === 'th' ? item.nameTh : item.nameEn;
    return {
      bouquetId: item.bouquetId,
      bouquetTitle,
      size: item.size.label,
      price: item.size.price,
      addOns: {
        cardType: mapCardType(item.addOns),
        cardMessage: item.addOns.cardMessage?.trim() ?? '',
        wrappingOption: mapWrappingToOption(item.addOns.wrappingPreference),
      },
    };
  });

  let itemsTotal = 0;
  for (const item of cartItems) {
    itemsTotal += item.size.price;
    if (item.addOns.cardType === 'beautiful') {
      itemsTotal += CARD_BEAUTIFUL_PRICE_THB;
    }
  }
  const deliveryFee = 0;
  const grandTotal = itemsTotal + deliveryFee;

  return {
    customerName: contact.customerName.trim() || undefined,
    phone: contact.phone.trim() || undefined,
    items: orderItems,
    delivery: {
      address: deliveryAddress,
      district: delivery.district?.id,
      preferredTimeSlot,
    },
    pricing: {
      itemsTotal,
      deliveryFee,
      grandTotal,
    },
    contactPreference:
      contact.contactPreference.length > 0 ? contact.contactPreference : undefined,
  };
}

export function CartPageClient({ lang }: { lang: Locale }) {
  const { items, removeItem, clearCart } = useCart();
  const [delivery, setDelivery] = useState<DeliveryFormValues>({
    district: null,
    date: '',
    deliveryType: 'standard',
  });
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [countryCode, setCountryCode] = useState('66');
  const [phoneNational, setPhoneNational] = useState('');
  const [contactPreference, setContactPreference] = useState<ContactPreferenceOption[]>([]);
  const t = translations[lang].cart;
  const tBuyNow = translations[lang].buyNow;

  const toggleContactPreference = (option: ContactPreferenceOption) => {
    setContactPreference((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
    setPhoneNational(digitsOnly);
  };

  const handlePlaceOrder = async () => {
    if (!delivery.district || !delivery.date) {
      setOrderError(lang === 'th' ? 'กรุณาเลือกพื้นที่จัดส่งและวันจัดส่ง' : 'Please select delivery area and date.');
      return;
    }
    if (!customerName.trim()) {
      setOrderError(t.contactNameRequired);
      return;
    }
    if (!phoneNational) {
      setOrderError(t.contactPhoneRequired);
      return;
    }
    if (phoneNational.length < PHONE_MIN_DIGITS) {
      setOrderError(t.contactPhoneMinLength);
      return;
    }
    if (phoneNational.length > PHONE_MAX_DIGITS) {
      setOrderError(t.contactPhoneMaxLength);
      return;
    }
    if (!/^\d+$/.test(phoneNational)) {
      setOrderError(t.contactPhoneDigitsOnly);
      return;
    }
    if (contactPreference.length === 0) {
      setOrderError(t.contactMethodRequired);
      return;
    }
    setOrderError(null);
    setPlacing(true);
    const fullPhone = countryCode + phoneNational;
    try {
      const payload = buildOrderPayload(items, delivery, lang, {
        customerName: customerName.trim(),
        phone: fullPhone,
        contactPreference,
      });
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOrderError(data.error ?? t.couldNotCreateOrder);
        setPlacing(false);
        return;
      }
      const { orderId, publicOrderUrl, shareText } = data;
      clearCart();
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('lanna-bloom-last-order-id', orderId);
        } catch {
          // ignore
        }
      }
      const params = new URLSearchParams({
        orderId,
        publicOrderUrl: publicOrderUrl ?? '',
        shareText: shareText ?? `New order: ${orderId}. Details: ${publicOrderUrl}`,
      });
      window.location.href = `/${lang}/checkout/success?${params.toString()}`;
    } catch {
      setOrderError(t.couldNotCreateOrder);
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <h1 className="cart-page-title">{t.yourCart}</h1>
          <div className="cart-empty">
            <p className="cart-empty-text">{t.cartEmpty}</p>
            <Link href={`/${lang}/catalog`} className="cart-empty-link">
              {t.cartEmptyLink}
            </Link>
          </div>
        </div>
        <style jsx>{`
          .cart-page {
            padding: 24px 0 48px;
          }
          .cart-page-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text);
            margin: 0 0 20px;
          }
          .cart-empty {
            padding: 32px 24px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            text-align: center;
          }
          .cart-empty-text {
            margin: 0 0 16px;
            font-size: 1rem;
            color: var(--text-muted);
          }
          .cart-empty-link {
            font-size: 1rem;
            font-weight: 600;
            color: var(--accent);
            text-decoration: underline;
          }
          .cart-empty-link:hover {
            color: #967a4d;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="cart-page-title">{t.yourCart}</h1>
        <div className="cart-list">
          {items.map((item, index) => {
            const name = lang === 'th' ? item.nameTh : item.nameEn;
            const addOnsSummary = buildAddOnsSummaryForDisplay(
              item.addOns,
              tBuyNow as Record<string, string | number>
            );
            return (
              <div key={`${item.bouquetId}-${index}`} className="cart-item">
                {item.imageUrl && (
                  <div className="cart-item-image-wrap">
                    <Image
                      src={item.imageUrl}
                      alt=""
                      width={80}
                      height={80}
                      className="cart-item-image"
                      sizes="80px"
                    />
                  </div>
                )}
                <div className="cart-item-main">
                  <h3 className="cart-item-name">{name}</h3>
                  <p className="cart-item-size">
                    {item.size.label} — ฿{item.size.price.toLocaleString()}
                  </p>
                  {addOnsSummary && (
                    <p className="cart-item-addons">{addOnsSummary}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="cart-item-remove"
                  onClick={() => removeItem(index)}
                  aria-label={t.remove}
                >
                  {t.remove}
                </button>
              </div>
            );
          })}
        </div>
        <section className="cart-delivery" aria-labelledby="cart-delivery-heading">
          <h2 id="cart-delivery-heading" className="cart-section-title">
            {t.deliveryAndContact}
          </h2>
          <DeliveryForm
            lang={lang}
            value={delivery}
            onChange={setDelivery}
            step3Heading={t.contactInfoStepHeading}
            step3Content={
              <div className="cart-place-order">
                <div className="cart-contact-info">
                  <div className="cart-contact-field">
                    <label className="cart-contact-label" htmlFor="cart-customer-name">
                      {t.yourName} <span className="cart-required" aria-hidden>*</span>
                    </label>
                    <input
                      id="cart-customer-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={t.yourNamePlaceholder}
                      className="cart-contact-input"
                      aria-required
                      autoComplete="name"
                    />
                  </div>
                  <div className="cart-contact-field">
                    <label className="cart-contact-label" htmlFor="cart-phone">
                      {t.phoneNumber} <span className="cart-required" aria-hidden>*</span>
                    </label>
                    <div className="cart-phone-row">
                      <select
                        id="cart-country-code"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="cart-phone-country-select"
                        aria-label={t.countryCode}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <input
                        id="cart-phone"
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={phoneNational}
                        onChange={handlePhoneInput}
                        placeholder={t.phoneNumberPlaceholder}
                        className="cart-contact-input cart-phone-input"
                        autoComplete="tel-national"
                        maxLength={PHONE_MAX_DIGITS}
                        aria-describedby="cart-phone-hint"
                      />
                    </div>
                    <p id="cart-phone-hint" className="cart-phone-hint">
                      {lang === 'th' ? 'เฉพาะตัวเลข 8–15 หลัก' : 'Digits only, 8–15 characters'}
                    </p>
                  </div>
                  <fieldset className="cart-contact-checkboxes" aria-label={t.preferredContact}>
                    <legend className="cart-contact-legend">
                      {t.preferredContact} <span className="cart-required" aria-hidden>*</span>
                    </legend>
                    {CONTACT_OPTIONS.map((option) => (
                      <label key={option} className="cart-contact-checkbox-label">
                        <input
                          type="checkbox"
                          checked={contactPreference.includes(option)}
                          onChange={() => toggleContactPreference(option)}
                          className="cart-contact-checkbox"
                        />
                        <span>
                          {option === 'phone' && t.contactPhone}
                          {option === 'line' && t.contactLine}
                          {option === 'whatsapp' && t.contactWhatsApp}
                          {option === 'telegram' && t.contactTelegram}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                </div>
                <button
                  type="button"
                  className="cart-place-order-btn"
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  aria-busy={placing}
                >
                  {placing ? (lang === 'th' ? 'กำลังสร้างออเดอร์...' : 'Creating order...') : t.placeOrder}
                </button>
                {orderError && (
                  <p className="cart-place-order-error" role="alert">
                    {orderError}
                  </p>
                )}
              </div>
            }
          />
        </section>
      </div>
      <style jsx>{`
        .cart-page {
          padding: 24px 0 48px;
        }
        .cart-page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 20px;
        }
        .cart-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }
        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }
        .cart-item-image-wrap {
          flex-shrink: 0;
          width: 80px;
          height: 80px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--pastel-cream, #fdf8f3);
        }
        .cart-item-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
        }
        .cart-item-main {
          flex: 1;
          min-width: 0;
        }
        .cart-item-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 4px;
        }
        .cart-item-size {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent);
          margin: 0 0 4px;
        }
        .cart-item-addons {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
        }
        .cart-item-remove {
          flex-shrink: 0;
          padding: 6px 12px;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .cart-item-remove:hover {
          border-color: var(--accent);
          color: var(--text);
        }
        .cart-delivery {
          margin-bottom: 32px;
        }
        .cart-section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 16px;
        }
        .cart-place-order {
          margin-top: 8px;
        }
        .cart-place-order-btn {
          width: 100%;
          padding: 14px 20px;
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          background: var(--accent);
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .cart-place-order-btn:hover:not(:disabled) {
          background: #b39868;
          transform: translateY(-1px);
        }
        .cart-place-order-btn:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }
        .cart-place-order-error {
          margin: 12px 0 0;
          font-size: 0.9rem;
          color: #b91c1c;
        }
        .cart-contact-info {
          margin-bottom: 20px;
        }
        .cart-contact-field {
          margin-bottom: 12px;
        }
        .cart-contact-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .cart-required {
          color: #b91c1c;
        }
        .cart-contact-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 0.95rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface);
          color: var(--text);
          font-family: inherit;
        }
        .cart-contact-input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .cart-phone-row {
          display: flex;
          align-items: stretch;
          gap: 0;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface);
        }
        .cart-phone-row:focus-within {
          border-color: var(--accent);
        }
        .cart-phone-country-select {
          padding: 10px 12px;
          font-size: 0.95rem;
          border: none;
          border-right: 1px solid var(--border);
          border-radius: var(--radius-sm) 0 0 var(--radius-sm);
          background: var(--pastel-cream);
          color: var(--text);
          font-family: inherit;
          font-weight: 600;
          cursor: pointer;
          flex-shrink: 0;
          width: auto;
          min-width: 7rem;
          max-width: 12rem;
        }
        .cart-phone-country-select:focus {
          outline: none;
        }
        .cart-phone-country-select option {
          font-weight: normal;
        }
        .cart-phone-input {
          flex: 1;
          min-width: 0;
          border: none;
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }
        .cart-phone-input:focus {
          outline: none;
          box-shadow: none;
        }
        .cart-phone-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 6px 0 0;
        }
        .cart-contact-checkboxes {
          margin: 16px 0 0;
          padding: 0;
          border: none;
        }
        .cart-contact-legend {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .cart-contact-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.9rem;
          color: var(--text);
          cursor: pointer;
        }
        .cart-contact-checkbox {
          margin: 0;
          accent-color: var(--accent);
        }
      `}</style>
    </div>
  );
}
