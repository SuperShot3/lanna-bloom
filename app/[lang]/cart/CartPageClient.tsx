'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { DeliveryForm, DELIVERY_TIME_SLOTS, type DeliveryFormValues } from '@/components/DeliveryForm';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type {
  OrderPayload,
  ContactPreferenceOption,
} from '@/lib/orders';
import type { CartItem } from '@/contexts/CartContext';
import {
  trackBeginCheckout,
  trackViewCart,
  trackRemoveFromCart,
  trackAddShippingInfo,
  trackAddPaymentInfo,
} from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';
import { calcDeliveryFeeTHB, type DistrictKey } from '@/lib/deliveryFees';
import {
  getStoredReferral,
  clearReferral,
  computeReferralDiscount,
} from '@/lib/referral';
import { ReferralCodeBox } from '@/components/ReferralCodeBox';
import { StickyCheckoutBar } from '@/components/checkout/StickyCheckoutBar';
import { TrustBadges } from '@/components/TrustBadges';
import { getPaymentAvailability } from '@/lib/checkout/paymentAvailability';
import { getAddOnsTotal } from '@/lib/addonsConfig';

/** Format YYYY-MM-DD to DD MMM for display (e.g. 2026-03-10 → 10 Mar). */
function formatStickyDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr + 'T12:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en', { month: 'short' });
  return `${day} ${month}`;
}

/** Add-ons are not displayed on cart/checkout per UX. */
function buildAddOnsSummaryForDisplay(): string {
  return '';
}

/** Add-on lines for order summary — not displayed on checkout. */
function buildAddOnsSummaryLines(): string[] {
  return [];
}

/** Build identifiers-only payload for Stripe (no prices from client). */
function buildStripePayload(
  cartItems: CartItem[],
  delivery: DeliveryFormValues,
  lang: Locale,
  contact: {
    customerName: string;
    phone: string;
    customerEmail?: string;
    contactPreference: ContactPreferenceOption[];
    recipientName?: string;
    recipientPhone?: string;
  }
): Record<string, unknown> {
  const addressLineTrim = delivery.addressLine?.trim() ?? '';
  const preferredTimeSlot =
    delivery.date && delivery.timeSlot
      ? `${delivery.date} ${delivery.timeSlot}`
      : delivery.date || delivery.timeSlot || '';

  const items: Array<{
    itemType: 'bouquet' | 'product';
    bouquetId: string;
    bouquetSlug?: string;
    size: string;
    addOns: {
      cardType: null;
      cardMessage: string;
      wrappingOption: null;
      productAddOns?: Record<string, boolean>;
    };
    imageUrl?: string;
  }> = [];
  for (const item of cartItems) {
    const qty = item.quantity ?? 1;
    const base = {
      itemType: (item.itemType ?? 'bouquet') as 'bouquet' | 'product',
      bouquetId: item.bouquetId,
      bouquetSlug: item.slug ?? undefined,
      size: item.size.key ?? 'm',
      addOns: {
        cardType: null,
        cardMessage: item.addOns.cardMessage?.trim() ?? '',
        wrappingOption: null,
        productAddOns: item.addOns.productAddOns ?? undefined,
      },
      imageUrl: item.imageUrl ?? undefined,
    };
    for (let i = 0; i < qty; i++) items.push(base);
  }

  const district = (delivery.deliveryDistrict || 'UNKNOWN') as DistrictKey;
  const isMueangCentral = delivery.deliveryDistrict === 'MUEANG' && delivery.isMueangCentral;
  const itemsTotal = cartItems.reduce(
    (sum, item) =>
      sum +
      (item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {})) *
        (item.quantity ?? 1),
    0
  );
  const deliveryFee = calcDeliveryFeeTHB({ district, isMueangCentral });
  const subtotal = itemsTotal + deliveryFee;
  const referral = getStoredReferral();
  const referralDiscount = computeReferralDiscount(subtotal, referral);

  return {
    lang,
    customerName: contact.customerName.trim(),
    phone: contact.phone.trim(),
    customerEmail: contact.customerEmail?.trim() || undefined,
    contactPreference: contact.contactPreference,
    items,
    delivery: {
      address: addressLineTrim,
      preferredTimeSlot,
      recipientName: contact.recipientName?.trim() || undefined,
      recipientPhone: contact.recipientPhone?.trim() || undefined,
      deliveryLat: delivery.deliveryLat ?? undefined,
      deliveryLng: delivery.deliveryLng ?? undefined,
      deliveryGoogleMapsUrl: delivery.deliveryGoogleMapsUrl ?? undefined,
      deliveryDistrict: district,
      isMueangCentral,
    },
    ...(referral && referralDiscount > 0 && {
      referralCode: referral.code,
      referralDiscount,
    }),
  };
}

const CONTACT_OPTIONS: ContactPreferenceOption[] = ['phone', 'line', 'whatsapp', 'telegram'];

const CART_FORM_STORAGE_KEY = 'lanna-bloom-cart-form';
const PREFERRED_DELIVERY_KEY = 'lanna-bloom-preferred-delivery-date';
const PREFERRED_TIME_KEY = 'lanna-bloom-preferred-delivery-time';

function getProductPageDeliveryPreference(): { date: string; timeSlot: string } {
  if (typeof window === 'undefined') return { date: '', timeSlot: '' };
  const todayStr = new Date().toISOString().slice(0, 10);
  const storedDate = sessionStorage.getItem(PREFERRED_DELIVERY_KEY);
  const storedTime = sessionStorage.getItem(PREFERRED_TIME_KEY);
  const date = storedDate && /^\d{4}-\d{2}-\d{2}$/.test(storedDate) && storedDate >= todayStr
    ? storedDate
    : todayStr;
  const timeSlot = storedTime && DELIVERY_TIME_SLOTS.includes(storedTime as typeof DELIVERY_TIME_SLOTS[number])
    ? storedTime
    : DELIVERY_TIME_SLOTS[0];
  return { date, timeSlot };
}

type StoredCartForm = {
  delivery: DeliveryFormValues;
  customerName: string;
  customerEmail: string;
  countryCode: string;
  phoneNational: string;
  recipientName: string;
  recipientCountryCode: string;
  recipientPhoneNational: string;
  contactPreference: ContactPreferenceOption[];
  isOrderingForSomeoneElse?: boolean;
};

function loadCartFormFromStorage(): StoredCartForm | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CART_FORM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCartForm;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCartFormToStorage(data: StoredCartForm) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_FORM_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function clearCartFormStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CART_FORM_STORAGE_KEY);
  } catch {
    // ignore
  }
}

const PHONE_MIN_DIGITS = 8;
const PHONE_MAX_DIGITS = 15;

/** Validation helpers for accordion Save & Continue (same rules as handlePlaceOrder). */
function isDeliveryValid(
  delivery: DeliveryFormValues,
  _tBuyNow: Record<string, string | number>
): boolean {
  if (!delivery.deliveryDistrict) return false;
  const addressTrim = delivery.addressLine?.trim() ?? '';
  if (addressTrim.length < 10 || addressTrim.length > 300) return false;
  if (!delivery.date || !delivery.timeSlot) return false;
  return true;
}

function isContactValid(
  customerName: string,
  phoneNational: string,
  contactPreference: ContactPreferenceOption[],
  customerEmail: string,
  isOrderingForSomeoneElse: boolean,
  recipientName: string,
  recipientPhoneNational: string,
  _t: Record<string, string | number>
): boolean {
  if (!customerName.trim()) return false;
  if (!phoneNational || phoneNational.length < PHONE_MIN_DIGITS || phoneNational.length > PHONE_MAX_DIGITS) return false;
  if (!/^\d+$/.test(phoneNational)) return false;
  if (contactPreference.length === 0) return false;
  if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) return false;
  if (isOrderingForSomeoneElse) {
    if (!recipientName.trim() || !recipientPhoneNational) return false;
    if (recipientPhoneNational.length < PHONE_MIN_DIGITS) return false;
  }
  return true;
}

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
  contact: {
    customerName: string;
    phone: string;
    customerEmail?: string;
    contactPreference: ContactPreferenceOption[];
    recipientName?: string;
    recipientPhone?: string;
  }
): OrderPayload {
  const addressLineTrim = delivery.addressLine?.trim() ?? '';
  const preferredTimeSlot = delivery.date && delivery.timeSlot
    ? `${delivery.date} ${delivery.timeSlot}`
    : delivery.date || delivery.timeSlot || '';

  const orderItems: OrderPayload['items'] = [];
  for (const item of cartItems) {
    const qty = item.quantity ?? 1;
    const bouquetTitle = lang === 'th' ? item.nameTh : item.nameEn;
    const addOnsTotal = getAddOnsTotal(item.addOns?.productAddOns ?? {});
    const itemPrice = item.size.price + addOnsTotal;
    for (let i = 0; i < qty; i++) {
      orderItems.push({
        bouquetId: item.bouquetId,
        bouquetTitle,
        size: item.size.label,
        price: itemPrice,
        addOns: {
          cardType: null,
          cardMessage: item.addOns.cardMessage?.trim() ?? '',
          wrappingOption: null,
        },
        imageUrl: item.imageUrl ?? undefined,
        bouquetSlug: item.slug ?? undefined,
      });
    }
  }

  const itemsTotal = cartItems.reduce(
    (sum, item) =>
      sum +
      (item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {})) *
        (item.quantity ?? 1),
    0
  );
  const district = (delivery.deliveryDistrict || 'UNKNOWN') as DistrictKey;
  const isMueangCentral = delivery.deliveryDistrict === 'MUEANG' && delivery.isMueangCentral;
  const deliveryFee = calcDeliveryFeeTHB({ district, isMueangCentral });
  const subtotal = itemsTotal + deliveryFee;
  const referral = getStoredReferral();
  const referralDiscount = computeReferralDiscount(subtotal, referral);
  const grandTotal = subtotal - referralDiscount;

  return {
    customerName: contact.customerName.trim(),
    phone: contact.phone.trim(),
    customerEmail: contact.customerEmail?.trim() || undefined,
    items: orderItems,
    delivery: {
      address: addressLineTrim,
      preferredTimeSlot,
      recipientName: contact.recipientName?.trim() || undefined,
      recipientPhone: contact.recipientPhone?.trim() || undefined,
      deliveryLat: delivery.deliveryLat ?? undefined,
      deliveryLng: delivery.deliveryLng ?? undefined,
      deliveryGoogleMapsUrl: delivery.deliveryGoogleMapsUrl ?? undefined,
      deliveryDistrict: district,
      isMueangCentral,
    },
    pricing: {
      itemsTotal,
      deliveryFee,
      grandTotal,
    },
    contactPreference: contact.contactPreference.length > 0 ? contact.contactPreference : ['phone'],
    ...(referral && referralDiscount > 0 && {
      referralCode: referral.code,
      referralDiscount,
    }),
  };
}

function cartItemsToAnalytics(items: CartItem[], lang: Locale): AnalyticsItem[] {
  return items.flatMap((item, index) => {
    const qty = item.quantity ?? 1;
    return Array.from({ length: qty }, (_, i) => ({
      item_id: item.bouquetId,
      item_name: lang === 'th' ? item.nameTh : item.nameEn,
      price: item.size.price,
      quantity: 1,
      index: index + i,
      item_category: undefined,
      item_variant: item.size.label,
    }));
  });
}

function cartValue(items: CartItem[]): number {
  return items.reduce(
    (v, item) =>
      v +
      (item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {})) *
        (item.quantity ?? 1),
    0
  );
}

export function CartPageClient({ lang }: { lang: Locale }) {
  const { items, count: totalItemCount, removeItem, clearCart } = useCart();
  const beginCheckoutFiredRef = useRef(false);
  const viewCartFiredRef = useRef(false);
  const addShippingInfoFiredRef = useRef(false);

  useEffect(() => {
    if (items.length === 0) return;
    const analyticsItems = cartItemsToAnalytics(items, lang);
    const value = cartValue(items);
    if (!viewCartFiredRef.current) {
      viewCartFiredRef.current = true;
      trackViewCart(analyticsItems, value);
    }
    if (!beginCheckoutFiredRef.current) {
      beginCheckoutFiredRef.current = true;
      trackBeginCheckout({ currency: 'THB', value, items: analyticsItems });
    }
  }, [items, lang]);

  const defaultDelivery: DeliveryFormValues = {
    addressLine: '',
    date: '',
    timeSlot: '',
    deliveryLat: null,
    deliveryLng: null,
    deliveryGoogleMapsUrl: null,
    deliveryDistrict: '',
    isMueangCentral: false,
  };

  const [delivery, setDelivery] = useState<DeliveryFormValues>(() => {
    const stored = loadCartFormFromStorage();
    const d = stored?.delivery;
    if (!d || typeof d !== 'object') return defaultDelivery;
    const validDistrict = d.deliveryDistrict && ['MUEANG','SARAPHI','SAN_SAI','HANG_DONG','SAN_KAMPHAENG','MAE_RIM','DOI_SAKET','MAE_ON','SAMOENG','MAE_TAENG','UNKNOWN'].includes(d.deliveryDistrict)
      ? d.deliveryDistrict
      : '';
    return {
      addressLine: typeof d.addressLine === 'string' ? d.addressLine : defaultDelivery.addressLine,
      date: typeof d.date === 'string' ? d.date : defaultDelivery.date,
      timeSlot: typeof d.timeSlot === 'string' ? d.timeSlot : defaultDelivery.timeSlot,
      deliveryLat: typeof d.deliveryLat === 'number' ? d.deliveryLat : null,
      deliveryLng: typeof d.deliveryLng === 'number' ? d.deliveryLng : null,
      deliveryGoogleMapsUrl: typeof d.deliveryGoogleMapsUrl === 'string' ? d.deliveryGoogleMapsUrl : null,
      deliveryDistrict: validDistrict,
      isMueangCentral: d.deliveryDistrict === 'MUEANG' && !!d.isMueangCentral,
    };
  });

  useEffect(() => {
    const pref = getProductPageDeliveryPreference();
    setDelivery((prev) => ({
      ...prev,
      date: pref.date || prev.date,
      timeSlot: pref.timeSlot || prev.timeSlot,
    }));
  }, []);

  const [placing, setPlacing] = useState(false);
  const [placingStripe, setPlacingStripe] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [referralCleared, setReferralCleared] = useState(0);
  const [customerName, setCustomerName] = useState(() => loadCartFormFromStorage()?.customerName ?? '');
  const [customerEmail, setCustomerEmail] = useState(() => loadCartFormFromStorage()?.customerEmail ?? '');
  const [countryCode, setCountryCode] = useState(() => loadCartFormFromStorage()?.countryCode ?? '66');
  const [phoneNational, setPhoneNational] = useState(() => loadCartFormFromStorage()?.phoneNational ?? '');
  const [recipientName, setRecipientName] = useState(() => loadCartFormFromStorage()?.recipientName ?? '');
  const [recipientCountryCode, setRecipientCountryCode] = useState(() => loadCartFormFromStorage()?.recipientCountryCode ?? '66');
  const [recipientPhoneNational, setRecipientPhoneNational] = useState(() => loadCartFormFromStorage()?.recipientPhoneNational ?? '');
  const [isOrderingForSomeoneElse, setIsOrderingForSomeoneElse] = useState(() => loadCartFormFromStorage()?.isOrderingForSomeoneElse ?? false);
  const [contactPreference, setContactPreference] = useState<ContactPreferenceOption[]>(() => {
    const stored = loadCartFormFromStorage()?.contactPreference;
    if (!Array.isArray(stored)) return [];
    return stored.filter((o): o is ContactPreferenceOption =>
      CONTACT_OPTIONS.includes(o)
    );
  });

  type AccordionSection = 'bag' | 'delivery' | 'contact';
  const [mobileOpenSection, setMobileOpenSection] = useState<AccordionSection | null>('delivery');
  const deliverySectionRef = useRef<HTMLDivElement>(null);
  const contactSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length === 0) return;
    saveCartFormToStorage({
      delivery,
      customerName,
      customerEmail,
      countryCode,
      phoneNational,
      recipientName,
      recipientCountryCode,
      recipientPhoneNational,
      contactPreference,
      isOrderingForSomeoneElse,
    });
  }, [items.length, delivery, customerName, customerEmail, countryCode, phoneNational, recipientName, recipientCountryCode, recipientPhoneNational, contactPreference, isOrderingForSomeoneElse]);

  useEffect(() => {
    if (!addShippingInfoFiredRef.current && items.length > 0 && delivery.addressLine.trim().length >= 10) {
      addShippingInfoFiredRef.current = true;
      const analyticsItems = cartItemsToAnalytics(items, lang);
      trackAddShippingInfo({
        shippingTier: 'standard',
        currency: 'THB',
        value: cartValue(items),
        items: analyticsItems,
      });
    }
  }, [delivery.addressLine, items, lang]);

  const t = translations[lang].cart;
  const tBuyNow = translations[lang].buyNow;

  const itemsTotalVal = cartValue(items);
  const hasChosenLocation = !!delivery.deliveryDistrict;
  const district = (delivery.deliveryDistrict || 'UNKNOWN') as DistrictKey;
  const isMueangCentral = delivery.deliveryDistrict === 'MUEANG' && delivery.isMueangCentral;
  const deliveryFeeVal = hasChosenLocation ? calcDeliveryFeeTHB({ district, isMueangCentral }) : 0;
  const subtotalWithDelivery = itemsTotalVal + deliveryFeeVal;
  const referralVal = getStoredReferral();
  const referralDiscountVal = computeReferralDiscount(subtotalWithDelivery, referralVal);
  const grandTotalVal = subtotalWithDelivery - referralDiscountVal;

  const [mobileCompleted, setMobileCompleted] = useState<Set<AccordionSection>>(new Set());

  const isDeliveryValidNow = isDeliveryValid(delivery, tBuyNow as Record<string, string | number>);
  const isContactValidNow = isContactValid(customerName, phoneNational, contactPreference, customerEmail, isOrderingForSomeoneElse, recipientName, recipientPhoneNational, t as Record<string, string | number>);
  const isPaymentUnlocked = isDeliveryValidNow && isContactValidNow;

  /** Returns the first incomplete field's name for the sticky bar lock message. */
  const getFirstIncompleteHint = (): string => {
    const tB = tBuyNow as Record<string, string | number>;
    const tC = t as Record<string, string | number>;
    const isMissing = (tC as { fieldIsMissing?: string }).fieldIsMissing ?? 'is missing';
    const fmt = (label: string) => `${label} ${isMissing}`;
    if (!delivery.deliveryDistrict) {
      return fmt(String(tB.districtLabel ?? 'District'));
    }
    const addressTrim = delivery.addressLine?.trim() ?? '';
    if (addressTrim.length < 10) {
      return fmt(String(tB.addressLabel ?? 'Address'));
    }
    if (addressTrim.length > 300) {
      return fmt(String(tB.addressLabel ?? 'Address'));
    }
    if (!delivery.date) {
      return fmt(String(tB.specifyDeliveryDate ?? tC.dateLabel ?? 'Date'));
    }
    if (!delivery.timeSlot) {
      return fmt(String(tB.selectTimeSlot ?? 'Time slot'));
    }
    if (!customerName.trim()) {
      return fmt(String(tC.senderName ?? 'Name'));
    }
    if (!phoneNational) {
      return fmt(String(tC.phoneNumber ?? 'Phone'));
    }
    if (phoneNational.length < PHONE_MIN_DIGITS) {
      return fmt(String(tC.phoneNumber ?? 'Phone'));
    }
    if (phoneNational.length > PHONE_MAX_DIGITS) {
      return fmt(String(tC.phoneNumber ?? 'Phone'));
    }
    if (!/^\d+$/.test(phoneNational)) {
      return fmt(String(tC.phoneNumber ?? 'Phone'));
    }
    if (contactPreference.length === 0) {
      return fmt(String(tC.preferredContact ?? 'Contact method'));
    }
    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      return fmt(String(tC.emailLabel ?? 'Email'));
    }
    if (isOrderingForSomeoneElse) {
      if (!recipientName.trim()) {
        return fmt(String(tC.recipientName ?? 'Recipient name'));
      }
      if (!recipientPhoneNational) {
        return fmt(String(tC.recipientPhone ?? 'Recipient phone'));
      }
      if (recipientPhoneNational.length < PHONE_MIN_DIGITS) {
        return fmt(String(tC.recipientPhone ?? 'Recipient phone'));
      }
    }
    return '';
  };

  useEffect(() => {
    if (!orderError) return;
    const t = setTimeout(() => setOrderError(null), 5000);
    return () => clearTimeout(t);
  }, [orderError]);

  const toggleMobileSection = (section: AccordionSection) => {
    setMobileOpenSection((prev) => (prev === section ? null : section));
  };

  const handleStickyCtaClick = () => {
    if (isPaymentUnlocked) {
      handlePayByCard();
    } else {
      const targetSection: AccordionSection = !isDeliveryValidNow ? 'delivery' : 'contact';
      setMobileOpenSection(targetSection);
      const ref = !isDeliveryValidNow ? deliverySectionRef : contactSectionRef;
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  };

  const handleMobileDeliverySave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDeliveryValid(delivery, tBuyNow as Record<string, string | number>)) return;
    setMobileCompleted((prev) => new Set(prev).add('delivery'));
    setMobileOpenSection('contact');
    setTimeout(() => contactSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleMobileContactSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isContactValid(customerName, phoneNational, contactPreference, customerEmail, isOrderingForSomeoneElse, recipientName, recipientPhoneNational, t as Record<string, string | number>)) return;
    setMobileCompleted((prev) => new Set(prev).add('contact'));
    setMobileOpenSection(null);
  };

  const toggleContactPreference = (option: ContactPreferenceOption) => {
    setContactPreference((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
    setPhoneNational(digitsOnly);
  };

  const handleRecipientPhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
    setRecipientPhoneNational(digitsOnly);
  };

  const handlePlaceOrder = async () => {
    const hint = getFirstIncompleteHint();
    if (hint) {
      setOrderError(hint);
      return;
    }
    setOrderError(null);
    setPlacing(true);
    const fullPhone = countryCode + phoneNational;
    const recipientPhone = isOrderingForSomeoneElse ? recipientCountryCode + recipientPhoneNational : undefined;
    try {
      const payload = buildOrderPayload(items, delivery, lang, {
        customerName: customerName.trim(),
        phone: fullPhone,
        customerEmail: customerEmail.trim() || undefined,
        contactPreference,
        ...(isOrderingForSomeoneElse && {
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone!,
        }),
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
      clearCartFormStorage();
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

  const handlePayByCard = async () => {
    const hint = getFirstIncompleteHint();
    if (hint) {
      setOrderError(hint);
      return;
    }
    setOrderError(null);
    setPlacingStripe(true);
    const fullPhone = countryCode + phoneNational;
    const recipientPhone = isOrderingForSomeoneElse ? recipientCountryCode + recipientPhoneNational : undefined;
    const analyticsItems = cartItemsToAnalytics(items, lang);
    trackAddPaymentInfo({
      paymentType: 'card',
      currency: 'THB',
      value: grandTotalVal,
      items: analyticsItems,
    });
    try {
      const payload = buildStripePayload(items, delivery, lang, {
        customerName: customerName.trim(),
        phone: fullPhone,
        customerEmail: customerEmail.trim() || undefined,
        contactPreference,
        ...(isOrderingForSomeoneElse && {
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone!,
        }),
      });
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOrderError(data.error ?? t.couldNotCreateOrder);
        setPlacingStripe(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setOrderError(t.couldNotCreateOrder);
    } catch {
      setOrderError(t.couldNotCreateOrder);
    }
    setPlacingStripe(false);
  };

  if (items.length === 0) {
    return (
      <div className="cart-page cart-page-empty">
        <div className="container">
          <div className="cart-page-header">
            <h1 className="cart-page-title">{t.yourCart}</h1>
            <span className="cart-page-count">{(t.cartItemsCount ?? '{count} items').replace('{count}', '0')}</span>
          </div>

          <p className="cart-empty-track-link">
            <Link href={`/${lang}/track-order`}>
              {(t as { searchMyOrder?: string; trackOrder?: string }).searchMyOrder ??
                (t as { searchMyOrder?: string; trackOrder?: string }).trackOrder ??
                'Search'}
            </Link>
          </p>

          <p className="cart-footer-note">{(t.cartFooterNote ?? 'Need help? Contact us via LINE or WhatsApp.')}</p>
        </div>
        <style jsx>{`
          .cart-page-empty {
            padding: 28px 20px 40px;
          }
          .cart-page-header {
            display: flex;
            align-items: baseline;
            gap: 10px;
            margin-bottom: 28px;
          }
          .cart-page-title {
            font-family: var(--font-serif);
            font-size: 2.25rem;
            font-weight: 300;
            line-height: 1;
            color: var(--text);
            margin: 0;
          }
          .cart-page-count {
            font-size: 13px;
            color: var(--text-muted);
            font-weight: 400;
          }
          .cart-empty-track-link {
            text-align: center;
            margin: 0 0 24px;
          }
          .cart-empty-track-link a {
            color: var(--accent);
            font-weight: 500;
            text-decoration: underline;
            text-underline-offset: 3px;
          }
          .cart-empty-track-link a:hover {
            opacity: 0.9;
          }
          .cart-footer-note {
            text-align: center;
            font-size: 11.5px;
            color: var(--text-muted);
            line-height: 1.6;
            padding: 0 10px;
            margin: 28px 0 0;
          }
        `}</style>
      </div>
    );
  }

  const contactFormContent = (idPrefix: string) => (
    <div className={`cart-contact-info ${idPrefix ? 'cart-mobile-contact-fields' : ''}`}>
      <div className="cart-contact-field">
        <label className="cart-contact-label" htmlFor={`${idPrefix}cart-customer-name`}>
          {t.senderName} <span className="cart-required" aria-hidden>*</span>
        </label>
        <input
          id={`${idPrefix}cart-customer-name`}
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
        <label className="cart-contact-label" htmlFor={`${idPrefix}cart-phone`}>
          {t.phoneNumber} <span className="cart-required" aria-hidden>*</span>
        </label>
        <div className="cart-phone-row">
          <select
            id={`${idPrefix}cart-country-code`}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="cart-phone-country-select"
            aria-label={t.countryCode}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <input
            id={`${idPrefix}cart-phone`}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={phoneNational}
            onChange={handlePhoneInput}
            placeholder={t.phoneNumberPlaceholder}
            className="cart-contact-input cart-phone-input"
            autoComplete="tel-national"
            maxLength={PHONE_MAX_DIGITS}
            aria-describedby={`${idPrefix}cart-phone-hint`}
          />
        </div>
        <p
          id={`${idPrefix}cart-phone-hint`}
          className="cart-phone-hint"
          style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 400, marginTop: '0.125rem', marginBottom: 0 }}
        >
          {lang === 'th' ? 'เฉพาะตัวเลข 8–15 หลัก' : 'Digits only, 8–15 characters'}
        </p>
      </div>
      <div className="cart-contact-field">
        <label className="cart-contact-label" htmlFor={`${idPrefix}cart-email`}>
          {t.emailLabel ?? 'Email'}
        </label>
        <input
          id={`${idPrefix}cart-email`}
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder={t.emailPlaceholder ?? 'e.g. you@example.com'}
          className="cart-contact-input"
          autoComplete="email"
        />
      </div>
      <label className="cart-contact-checkbox-label cart-ordering-for-else">
        <input
          type="checkbox"
          checked={isOrderingForSomeoneElse}
          onChange={(e) => setIsOrderingForSomeoneElse(e.target.checked)}
          className="cart-contact-checkbox"
        />
        <span className="cart-ordering-for-else-text">{t.orderingForSomeoneElse ?? "I'm ordering flowers for someone else"}</span>
      </label>
      {isOrderingForSomeoneElse && (
        <>
          <div className="cart-contact-field">
            <label className="cart-contact-label" htmlFor={`${idPrefix}cart-recipient-name`}>
              {t.recipientName} <span className="cart-required" aria-hidden>*</span>
            </label>
            <input
              id={`${idPrefix}cart-recipient-name`}
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={t.recipientNamePlaceholder}
              className="cart-contact-input"
              aria-required
              autoComplete="name"
            />
          </div>
          <div className="cart-contact-field">
            <label className="cart-contact-label" htmlFor={`${idPrefix}cart-recipient-phone`}>
              {t.recipientPhone} <span className="cart-required" aria-hidden>*</span>
            </label>
            <div className="cart-phone-row">
              <select
                id={`${idPrefix}cart-recipient-country-code`}
                value={recipientCountryCode}
                onChange={(e) => setRecipientCountryCode(e.target.value)}
                className="cart-phone-country-select"
                aria-label={t.countryCode}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input
                id={`${idPrefix}cart-recipient-phone`}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={recipientPhoneNational}
                onChange={handleRecipientPhoneInput}
                placeholder={t.recipientPhonePlaceholder}
                className="cart-contact-input cart-phone-input"
                autoComplete="tel-national"
                maxLength={PHONE_MAX_DIGITS}
                aria-describedby={`${idPrefix}cart-recipient-phone-hint`}
              />
            </div>
            <p
              id={`${idPrefix}cart-recipient-phone-hint`}
              className="cart-phone-hint"
              style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 400, marginTop: '0.125rem', marginBottom: 0 }}
            >
              {lang === 'th' ? 'เฉพาะตัวเลข 8–15 หลัก' : 'Digits only, 8–15 characters'}
            </p>
          </div>
        </>
      )}
      <fieldset className="cart-contact-preferences" aria-label={t.preferredContact}>
        <legend className="cart-contact-legend">
          {t.preferredContact} <span className="cart-required" aria-hidden>*</span>
        </legend>
        <div className="cart-contact-chips">
          {CONTACT_OPTIONS.map((option) => {
            const isSelected = contactPreference.includes(option);
            const label =
              option === 'phone' ? t.contactPhone
              : option === 'line' ? t.contactLine
              : option === 'whatsapp' ? t.contactWhatsApp
              : t.contactTelegram;
            return (
              <label
                key={option}
                className={`cart-contact-chip ${isSelected ? 'cart-contact-chip-selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleContactPreference(option)}
                  className="cart-contact-chip-input"
                  aria-label={label}
                />
                <span className="cart-contact-chip-box" aria-hidden />
                <span className="cart-contact-chip-label">{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );

  return (
    <div className="cart-page">
      <div className="container">
        <div className="cart-checkout-header">
          <Link href={`/${lang}/catalog`} className="cart-back-link">
            ← {t.backToShop}
          </Link>
        </div>
        <div className="cart-mobile-view">
          <header className="cart-mobile-header">
            <h1 className="cart-mobile-title">{lang === 'th' ? 'ชำระเงิน' : 'Checkout'}</h1>
            <p className="cart-mobile-subtitle">
              {totalItemCount} {lang === 'th' ? 'รายการ' : 'item(s)'} — ฿{grandTotalVal.toLocaleString()}
            </p>
          </header>
          <div className="cart-mobile-accordion">
            <div
              className={`cart-accordion-section ${mobileOpenSection === 'bag' ? 'cart-accordion-open' : ''}`}
              onClick={() => toggleMobileSection('bag')}
            >
              <div className="cart-accordion-header">
                <span className="cart-accordion-title">{lang === 'th' ? 'สินค้าในตะกร้า' : 'In Your Bag'}</span>
                <div className="cart-accordion-header-actions">
                  {mobileCompleted.has('bag') && <span className="cart-accordion-edit" onClick={(e) => { e.stopPropagation(); setMobileOpenSection('bag'); }}>{lang === 'th' ? 'แก้ไข' : 'Edit'}</span>}
                  <span className="cart-accordion-chevron" aria-hidden>▼</span>
                </div>
              </div>
              {mobileOpenSection === 'bag' && (
                <div className="cart-accordion-body cart-accordion-body-bag" onClick={(e) => e.stopPropagation()}>
                  <div className="cart-list cart-mobile-list">
                    {items.map((item, index) => {
                      const name = lang === 'th' ? item.nameTh : item.nameEn;
                      const addOnsSummary = buildAddOnsSummaryForDisplay();
                      return (
                        <div key={`${item.bouquetId}-${index}`} className="cart-item">
                          {item.imageUrl && (
                            <div className="cart-item-image-wrap">
                              <Image src={item.imageUrl} alt="" width={80} height={80} className="cart-item-image" sizes="80px" />
                            </div>
                          )}
                          <div className="cart-item-main">
                            <h3 className="cart-item-name">{name}</h3>
                            <p className="cart-item-size">
                              {item.itemType === 'product'
                                ? `฿${(item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {})).toLocaleString()}`
                                : (item.quantity ?? 1) > 1
                                  ? `${item.size.label} × ${item.quantity ?? 1} — ฿${((item.size.price) * (item.quantity ?? 1)).toLocaleString()}`
                                  : `${item.size.label} — ฿${item.size.price.toLocaleString()}`}
                            </p>
                            {addOnsSummary && <p className="cart-item-addons">{addOnsSummary}</p>}
                          </div>
                          <button
                            type="button"
                            className="cart-item-remove"
                            onClick={() => {
                              const removed = items[index];
                              const lineVal = removed.size.price * (removed.quantity ?? 1);
                              trackRemoveFromCart({
                                currency: 'THB',
                                value: lineVal,
                                items: [{ item_id: removed.bouquetId, item_name: lang === 'th' ? removed.nameTh : removed.nameEn, price: removed.size.price, quantity: removed.quantity ?? 1, index: 0, item_variant: removed.size.label }],
                              });
                              removeItem(index);
                            }}
                            aria-label={t.remove}
                          >
                            {t.remove}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cart-order-summary cart-mobile-summary">
                    <h3 className="cart-order-summary-title">{t.orderSummary}</h3>
                    {items.map((item, i) => {
                      const name = lang === 'th' ? item.nameTh : item.nameEn;
                      const qty = item.quantity ?? 1;
                      const addOnsTotal = getAddOnsTotal(item.addOns?.productAddOns ?? {});
                      const unitPrice = item.size.price + addOnsTotal;
                      const lineTotal = unitPrice * qty;
                      const itemLabel = item.itemType === 'product' ? name : qty > 1 ? `${name} — ${item.size.label} × ${qty}` : `${name} — ${item.size.label}`;
                      return (
                        <div key={`mob-sum-${item.bouquetId}-${i}`} className="cart-order-summary-row cart-order-summary-item">
                          <span>{itemLabel}</span>
                          <span className="cart-order-summary-amount">฿{lineTotal.toLocaleString()}</span>
                        </div>
                      );
                    })}
                    <div className="cart-order-summary-row">
                      <span>{t.deliveryFeeLabel}</span>
                      <span className="cart-order-summary-amount">฿{deliveryFeeVal.toLocaleString()}</span>
                    </div>
                    {referralVal && referralDiscountVal > 0 && (
                      <div className="cart-order-summary-row cart-order-summary-referral">
                        <span>{(t.referralDiscountLabel ?? 'Referral discount ({code})').replace('{code}', referralVal.code)}</span>
                        <span className="cart-order-summary-amount cart-order-summary-discount">-฿{referralDiscountVal.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="cart-order-summary-row cart-order-summary-total">
                      <span>{t.totalLabel}</span>
                      <span className="cart-order-summary-amount">฿{grandTotalVal.toLocaleString()}</span>
                    </div>
                  </div>
                  <ReferralCodeBox
                    lang={lang}
                    subtotal={subtotalWithDelivery}
                    appliedCode={referralVal?.code ?? null}
                    onApply={() => setReferralCleared((c) => c + 1)}
                    onRemove={() => setReferralCleared((c) => c + 1)}
                    hasOtherDiscount={false}
                  />
                </div>
              )}
            </div>
            <div
              ref={deliverySectionRef}
              className={`cart-accordion-section ${mobileOpenSection === 'delivery' ? 'cart-accordion-open' : ''}`}
              onClick={() => toggleMobileSection('delivery')}
            >
              <div className="cart-accordion-header">
                <span className="cart-accordion-title">{lang === 'th' ? 'การจัดส่ง' : 'Delivery Options'}</span>
                <div className="cart-accordion-header-actions">
                  {mobileCompleted.has('delivery') && <span className="cart-accordion-edit" onClick={(e) => { e.stopPropagation(); setMobileOpenSection('delivery'); }}>{lang === 'th' ? 'แก้ไข' : 'Edit'}</span>}
                  <span className="cart-accordion-chevron" aria-hidden>▼</span>
                </div>
              </div>
              {mobileOpenSection === 'delivery' && (
                <div className="cart-accordion-body" onClick={(e) => e.stopPropagation()}>
                  <DeliveryForm
                    lang={lang}
                    value={delivery}
                    onChange={setDelivery}
                    showLocationPicker
                    accordionMode
                    hideDateAndTime
                  />
                  <button
                    type="button"
                    className="cart-accordion-save-btn"
                    disabled={!isDeliveryValid(delivery, tBuyNow as Record<string, string | number>)}
                    onClick={handleMobileDeliverySave}
                  >
                    {lang === 'th' ? 'บันทึกและดำเนินการต่อ' : 'Save & Continue'}
                  </button>
                </div>
              )}
            </div>
            <div
              ref={contactSectionRef}
              className={`cart-accordion-section ${mobileOpenSection === 'contact' ? 'cart-accordion-open' : ''}`}
              onClick={() => toggleMobileSection('contact')}
            >
              <div className="cart-accordion-header">
                <span className="cart-accordion-title">{lang === 'th' ? 'ข้อมูลติดต่อ' : 'Contact'}</span>
                <div className="cart-accordion-header-actions">
                  {mobileCompleted.has('contact') && <span className="cart-accordion-edit" onClick={(e) => { e.stopPropagation(); setMobileOpenSection('contact'); }}>{lang === 'th' ? 'แก้ไข' : 'Edit'}</span>}
                  <span className="cart-accordion-chevron" aria-hidden>▼</span>
                </div>
              </div>
              {mobileOpenSection === 'contact' && (
                <div className="cart-accordion-body cart-accordion-body-contact" onClick={(e) => e.stopPropagation()}>
                  {contactFormContent('mobile-')}
                  <button
                    type="button"
                    className="cart-accordion-save-btn"
                    disabled={!isContactValid(customerName, phoneNational, contactPreference, customerEmail, isOrderingForSomeoneElse, recipientName, recipientPhoneNational, t as Record<string, string | number>)}
                    onClick={handleMobileContactSave}
                  >
                    {lang === 'th' ? 'บันทึกและดำเนินการต่อ' : 'Save & Continue'}
                  </button>
                </div>
              )}
            </div>
          </div>
          {(() => {
            const paymentAvailability = getPaymentAvailability({
              hasDeliveryDistrict: !!delivery.deliveryDistrict,
              isFormValid: isPaymentUnlocked,
              isLoading: placing || placingStripe,
              firstIncompleteHint: getFirstIncompleteHint(),
              messages: {
                selectDeliveryArea: lang === 'th' ? 'กรุณาเลือกพื้นที่จัดส่งเพื่อดูตัวเลือกชำระเงิน' : 'Select a delivery area to see payment options',
                processing: lang === 'th' ? 'กำลังดำเนินการ...' : 'Processing...',
              },
            });
            const incompleteHint = !paymentAvailability.stripe.enabled
              ? paymentAvailability.stripe.reason
              : undefined;
            const handleDateChange = () => {
              setMobileOpenSection('delivery');
              setTimeout(() => deliverySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            };
            return (
          <StickyCheckoutBar
            lang={lang}
            summary={{
              date: delivery.date,
              timeSlot: delivery.timeSlot,
              deliveryFee: deliveryFeeVal,
              total: grandTotalVal,
            }}
            availability={paymentAvailability}
            incompleteHint={incompleteHint}
            orderError={orderError}
            placing={placing}
            placingStripe={placingStripe}
            onPayStripe={handleStickyCtaClick}
            onPlaceOrder={handlePlaceOrder}
            onDateChange={handleDateChange}
            formatDate={formatStickyDate}
            labels={{
              dateLabel: t.dateLabel ?? 'Date',
              deliveryFeeLabel: t.deliveryFeeLabel,
              totalLabel: t.totalLabel,
              payWithStripe: translations[lang].cart.payWithStripe ?? 'Pay with Stripe',
              completeDetailsToPay: (t as { completeDetailsToPay?: string }).completeDetailsToPay ?? 'Complete details to pay',
              placeOrder: t.placeOrder,
              orderLabel: (t as { orderLabel?: string }).orderLabel ?? (lang === 'th' ? 'สั่งซื้อ' : 'Order'),
              redirecting: lang === 'th' ? 'กำลังเตรียมชำระเงิน...' : 'Redirecting...',
              creating: lang === 'th' ? 'กำลังสร้างออเดอร์...' : 'Creating...',
              unavailableRightNow: lang === 'th' ? 'ไม่พร้อมใช้งานในขณะนี้' : 'Unavailable right now',
              change: lang === 'th' ? 'เปลี่ยน' : 'Change',
              delivery: lang === 'th' ? 'จัดส่ง' : 'Delivery',
              showCheckout: lang === 'th' ? 'แสดงชำระเงิน' : 'Show checkout',
            }}
          />
            );
          })()}
        </div>
        <div className="cart-desktop-view">
        <div className="cart-desktop-layout">
        <div className="cart-desktop-column-left">
        <section className="cart-delivery cart-desktop-delivery">
          <DeliveryForm
            lang={lang}
            value={delivery}
            onChange={setDelivery}
            title={t.placeOrder}
            showLocationPicker
            step3Heading={t.contactInfoStepHeading}
            hideDateAndTime
            step3Content={
              <div className="cart-place-order">
                {contactFormContent('')}
                <div className="cart-place-order-actions">
                <div className="cart-place-order-buttons">
                  <button
                    type="button"
                    className="cart-place-order-btn cart-pay-by-stripe-btn"
                    onClick={handlePayByCard}
                    disabled={placing || placingStripe}
                    aria-busy={placingStripe}
                  >
                    {placingStripe ? (
                      lang === 'th' ? 'กำลังเตรียมชำระเงิน...' : 'Redirecting to payment...'
                    ) : (
                      <>
                        <span className="cart-stripe-logo" aria-hidden>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
                          </svg>
                        </span>
                        {translations[lang].cart.payWithStripe ?? 'Pay with Stripe'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`cart-place-order-btn cart-place-order-bank-btn ${isPaymentUnlocked ? 'cart-place-order-ready' : ''}`}
                    onClick={handlePlaceOrder}
                    disabled={placing || placingStripe}
                    aria-busy={placing}
                  >
                    {placing ? (lang === 'th' ? 'กำลังสร้างออเดอร์...' : 'Creating order...') : t.placeOrder}
                  </button>
                </div>
                {orderError && (
                  <p className="cart-place-order-error" role="alert">
                    {orderError}
                  </p>
                )}
                </div>
              </div>
            }
          />
        </section>
        </div>
        <div className="cart-desktop-column-right">
        <aside className="cart-sticky-sidebar">
        <div className="cart-items-and-summary">
        <div className="cart-list">
          {items.map((item, index) => {
            const name = lang === 'th' ? item.nameTh : item.nameEn;
            const addOnsSummary = buildAddOnsSummaryForDisplay();
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
                    {item.itemType === 'product'
                      ? `฿${(item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {})).toLocaleString()}`
                      : (item.quantity ?? 1) > 1
                        ? `${item.size.label} × ${item.quantity ?? 1} — ฿${((item.size.price) * (item.quantity ?? 1)).toLocaleString()}`
                        : `${item.size.label} — ฿${item.size.price.toLocaleString()}`}
                  </p>
                  {addOnsSummary && (
                    <p className="cart-item-addons">{addOnsSummary}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="cart-item-remove"
                  onClick={() => {
                    const removed = items[index];
                    const lineVal = removed.size.price * (removed.quantity ?? 1);
                    trackRemoveFromCart({
                      currency: 'THB',
                      value: lineVal,
                      items: [
                        {
                          item_id: removed.bouquetId,
                          item_name: lang === 'th' ? removed.nameTh : removed.nameEn,
                          price: removed.size.price,
                          quantity: removed.quantity ?? 1,
                          index: 0,
                          item_variant: removed.size.label,
                        },
                      ],
                    });
                    removeItem(index);
                  }}
                  aria-label={t.remove}
                >
                  {t.remove}
                </button>
              </div>
            );
          })}
        </div>
        {(() => {
          const itemLineFmt = (t.itemLineWithQty ?? t.itemLine ?? '{name} — {size} x{qty} — ฿{lineTotal}') as string;
          return (
            <div className="cart-summary-section">
              <div className="cart-order-summary">
                <h3 className="cart-order-summary-title">{t.orderSummary}</h3>
                {items.map((item, i) => {
                  const name = lang === 'th' ? item.nameTh : item.nameEn;
                  const qty = item.quantity ?? 1;
                  const addOnsTotal = getAddOnsTotal(item.addOns?.productAddOns ?? {});
                  const unitPrice = item.size.price + addOnsTotal;
                  const lineTotal = unitPrice * qty;
                  const priceStr = lineTotal.toLocaleString();
                  const sizePart = item.itemType === 'product' ? '—' : item.size.label;
                  const itemLine = itemLineFmt
                    .replace('{name}', name)
                    .replace('{size}', sizePart)
                    .replace('{qty}', String(qty))
                    .replace('{lineTotal}', priceStr)
                    .replace('{price}', priceStr);
                  const addOnLines = buildAddOnsSummaryLines();
                  return (
                    <div key={`summary-${item.bouquetId}-${i}`}>
                      <div className="cart-order-summary-row cart-order-summary-item">
                        <span className="cart-order-summary-item-name">{itemLine}</span>
                        <span className="cart-order-summary-amount">฿{lineTotal.toLocaleString()}</span>
                      </div>
                      {addOnLines.map((line, j) => (
                        <div key={j} className="cart-order-summary-row cart-order-summary-addon">
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
                <div className="cart-order-summary-row">
                  <span>{t.deliveryFeeLabel}</span>
                  <span className="cart-order-summary-amount">฿{deliveryFeeVal.toLocaleString()}</span>
                </div>
                {referralVal && referralDiscountVal > 0 && (
                  <div className="cart-order-summary-row cart-order-summary-referral">
                    <span>
                      {(t.referralDiscountLabel ?? 'Referral discount ({code})').replace('{code}', referralVal.code)}
                    </span>
                    <span className="cart-order-summary-amount cart-order-summary-discount">-฿{referralDiscountVal.toLocaleString()}</span>
                  </div>
                )}
                <div className="cart-order-summary-row cart-order-summary-total">
                  <span>{t.totalLabel}</span>
                  <span className="cart-order-summary-amount">฿{grandTotalVal.toLocaleString()}</span>
                </div>
                <p className="cart-order-summary-note">{t.deliveryTimeApproxNote ?? 'Delivery time is approximate (±30 min).'}</p>
              </div>
              <div className="referral-code-column">
                <ReferralCodeBox
                  lang={lang}
                  subtotal={subtotalWithDelivery}
                  appliedCode={referralVal?.code ?? null}
                  onApply={() => setReferralCleared((c) => c + 1)}
                  onRemove={() => setReferralCleared((c) => c + 1)}
                  hasOtherDiscount={false}
                />
              </div>
              <TrustBadges lang={lang} />
            </div>
          );
        })()}
        </div>
        </aside>
        </div>
        </div>
        </div>
      </div>
      <style jsx>{`
        .cart-page {
          padding: 12px 0 48px;
        }
        .cart-checkout-header {
          margin-bottom: 20px;
        }
        .cart-back-link {
          display: inline-block;
          font-size: 0.875rem;
          color: var(--accent);
          text-decoration: none;
          margin-bottom: 12px;
        }
        .cart-back-link:hover {
          text-decoration: underline;
        }
        .cart-page-header {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 28px;
        }
        .cart-page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 20px;
        }
        .cart-page-header .cart-page-title {
          margin: 0;
        }
        .cart-page-count {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .cart-desktop-layout {
          display: grid;
          grid-template-columns: 1fr 388px;
          gap: 32px;
          align-items: start;
          overflow: visible;
        }
        .cart-desktop-view {
          overflow: visible;
        }
        .cart-desktop-column-right {
          align-self: start;
        }
        .cart-sticky-sidebar {
          position: fixed;
          top: 78px;
          right: max(24px, calc((100vw - 1200px) / 2 + 24px));
          width: 388px;
          max-width: calc(100vw - 48px);
          z-index: 10;
          background: var(--pastel-cream, #fdf8f3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 16px;
          box-shadow: var(--shadow);
          box-sizing: border-box;
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
          min-width: 0;
        }
        .cart-items-and-summary {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .cart-desktop-column-right .cart-summary-section {
          flex-direction: column;
        }
        .cart-desktop-column-right .referral-code-column {
          max-width: 100%;
        }
        .cart-sticky-sidebar .cart-list {
          gap: 12px;
          margin-bottom: 0;
        }
        .cart-sticky-sidebar .cart-item {
          padding: 10px 12px;
          background: transparent;
          border: none;
          box-shadow: none;
          border-radius: 0;
          border-bottom: 1px solid var(--border);
          gap: 12px;
        }
        .cart-sticky-sidebar .cart-item:last-child {
          border-bottom: none;
        }
        .cart-sticky-sidebar .cart-order-summary {
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 0;
        }
        .cart-sticky-sidebar .cart-summary-section {
          gap: 12px;
          margin-bottom: 0;
        }
        .cart-sticky-sidebar .cart-order-summary-title {
          margin: 0 0 8px;
          font-size: 0.9rem;
        }
        .cart-sticky-sidebar .cart-order-summary-row {
          margin-bottom: 4px;
          font-size: 0.875rem;
        }
        .cart-sticky-sidebar .cart-order-summary-total {
          margin-top: 8px;
          padding-top: 8px;
        }
        .cart-sticky-sidebar .cart-order-summary-note {
          margin: 6px 0 0;
          font-size: 0.7rem;
        }
        .cart-sticky-sidebar .referral-code-column {
          margin-top: 4px;
        }
        .cart-sticky-sidebar .cart-item-image-wrap {
          width: 56px;
          height: 56px;
        }
        .cart-sticky-sidebar .cart-item-image {
          width: 56px !important;
          height: 56px !important;
        }
        .cart-sticky-sidebar .cart-item-name {
          font-size: 0.9rem;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .cart-sticky-sidebar .cart-item-size {
          font-size: 0.8rem;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .cart-sticky-sidebar .cart-item-main {
          min-width: 0;
        }
        .cart-sticky-sidebar .cart-order-summary-item .cart-order-summary-item-name {
          overflow-wrap: break-word;
          word-break: break-word;
          white-space: normal;
          min-width: 0;
        }
        .cart-sticky-sidebar .cart-order-summary-row {
          min-width: 0;
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
        .cart-summary-section {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }
        .cart-summary-section .cart-order-summary {
          flex: 2;
          min-width: 0;
        }
        .referral-code-column {
          flex: 1;
          min-width: 0;
          max-width: 320px;
        }
        @media (max-width: 640px) {
          .cart-summary-section {
            flex-direction: column;
          }
          .referral-code-column {
            max-width: 100%;
          }
        }
        .cart-order-summary {
          padding: 16px;
          background: var(--pastel-cream, #fdf8f3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .cart-order-summary-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 12px;
        }
        .cart-order-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.95rem;
          color: var(--text);
          margin-bottom: 6px;
          gap: 12px;
        }
        .cart-order-summary-amount {
          min-width: 5em;
          text-align: right;
          flex-shrink: 0;
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--text);
        }
        .cart-order-summary-amount.cart-order-summary-discount {
          color: var(--accent);
        }
        .cart-order-summary-total .cart-order-summary-amount {
          font-weight: 700;
        }
        .cart-order-summary-row:last-child {
          margin-bottom: 0;
        }
        .cart-order-summary-item .cart-order-summary-item-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        @media (max-width: 480px) {
          .cart-order-summary-item .cart-order-summary-item-name {
            white-space: normal;
          }
        }
        .cart-order-summary-addon {
          font-size: 0.95rem;
          color: var(--text-muted);
          padding-left: 8px;
        }
        .cart-order-summary-referral {
          flex-wrap: wrap;
          gap: 4px 8px;
        }
        .cart-order-summary-discount {
          color: var(--accent);
          font-weight: 600;
        }
        .cart-order-summary-total {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
          font-weight: 700;
          font-size: 0.95rem;
        }
        .cart-order-summary-note {
          margin: 8px 0 0;
          font-size: 0.75rem;
          color: var(--text-muted);
          opacity: 0.85;
        }
        .cart-delivery {
          margin-bottom: 32px;
        }
        .cart-delivery :global(.buy-now-form) {
          margin-top: 0;
        }
        .cart-section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 16px;
        }
        .cart-place-order {
          margin-top: 0;
        }
        .cart-place-order-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
        }
        .cart-place-order-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cart-place-order-btn {
          width: 100%;
          padding: 10px 16px;
          font-size: 0.9rem;
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
        .cart-pay-by-stripe-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #635BFF;
          border: 2px solid #635BFF;
          box-shadow: 0 2px 8px rgba(99, 91, 255, 0.35);
        }
        .cart-pay-by-stripe-btn:hover:not(:disabled) {
          background: #4f46e5;
          border-color: #4f46e5;
          box-shadow: 0 4px 12px rgba(99, 91, 255, 0.45);
        }
        .cart-stripe-logo {
          display: inline-flex;
          flex-shrink: 0;
        }
        .cart-stripe-logo svg {
          display: block;
        }
        .cart-place-order-bank-btn {
          background: var(--surface);
          color: var(--text);
          border: 2px solid var(--border);
        }
        .cart-place-order-bank-btn:hover:not(:disabled) {
          background: var(--pastel-cream);
          border-color: var(--accent);
          color: var(--text);
        }
        .cart-place-order-bank-btn.cart-place-order-ready {
          background: #86efac;
          border-color: #22c55e;
          color: #166534;
        }
        .cart-place-order-bank-btn.cart-place-order-ready:hover:not(:disabled) {
          background: #4ade80;
          border-color: #16a34a;
          color: #14532d;
        }
        .cart-place-order-error {
          margin: 0;
          font-size: 0.85rem;
          color: #b91c1c;
        }
        .cart-contact-info {
          margin-bottom: 20px;
          padding-top: 0;
        }
        .cart-contact-info > .cart-contact-field:first-child {
          margin-top: 0;
        }
        .cart-contact-field {
          margin-bottom: 12px;
        }
        .cart-section-label {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text);
          margin: 16px 0 8px;
        }
        .cart-section-label:first-child {
          margin-top: 0;
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
          font-size: 0.625rem;
          color: #94a3b8;
          font-weight: normal;
          margin: 0.125rem 0 0;
        }
        .cart-contact-preferences {
          margin: 16px 0 0;
          padding: 0;
          border: none;
        }
        .cart-contact-legend {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 10px;
          display: block;
        }
        .cart-contact-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .cart-contact-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: var(--pastel-cream);
          border: 2px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text);
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .cart-contact-chip:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .cart-contact-chip-selected {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .cart-contact-chip-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          pointer-events: none;
        }
        .cart-contact-chip-box {
          flex-shrink: 0;
          position: relative;
          width: 18px;
          height: 18px;
          border: 2px solid var(--border);
          border-radius: 4px;
          background: var(--surface);
          transition: border-color 0.2s, background 0.2s;
        }
        .cart-contact-chip-selected .cart-contact-chip-box {
          border-color: var(--accent);
          background: var(--accent);
        }
        .cart-contact-chip-selected .cart-contact-chip-box::after {
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
        .cart-contact-chip-label {
          user-select: none;
        }
        @media (min-width: 1201px) {
          .cart-mobile-view {
            display: none !important;
          }
        }
        @media (max-width: 1200px) {
          .cart-desktop-view {
            display: none !important;
          }
          .cart-mobile-view {
            display: block;
          }
          .cart-mobile-header {
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border);
            text-align: center;
          }
          .cart-mobile-title {
            font-size: 1.3rem;
            font-weight: 600;
            color: var(--text);
            margin: 0 0 4px;
          }
          .cart-mobile-subtitle {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text);
            margin: 0;
          }
          .cart-mobile-accordion {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .cart-accordion-section {
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
          }
          .cart-accordion-header {
            display: flex;
            align-items: center;
            padding: 16px 20px;
            cursor: pointer;
            user-select: none;
          }
          .cart-accordion-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text);
            flex: 1;
            min-width: 0;
          }
          .cart-accordion-header-actions {
            flex-shrink: 0;
            width: 20%;
            min-width: 80px;
            max-width: 100px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            margin-left: 16px;
          }
          .cart-accordion-edit {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--accent);
          }
          .cart-accordion-chevron {
            font-size: 0.7rem;
            color: var(--text-muted);
            transition: transform 0.2s;
          }
          .cart-accordion-open .cart-accordion-chevron {
            transform: rotate(180deg);
          }
          .cart-accordion-body {
            padding: 0 20px 20px;
          }
          .cart-accordion-body .buy-now-input,
          .cart-accordion-body .buy-now-select,
          .cart-accordion-body .buy-now-textarea {
            width: 100%;
            padding: 12px 14px;
            font-size: 1rem;
            border-radius: 8px;
            border: 1px solid var(--border);
            min-height: 48px;
          }
          .cart-accordion-body-contact {
            background: var(--surface);
            padding: 0 16px 16px;
            border-radius: var(--radius-sm);
            margin: 0 0 16px;
          }
          .cart-accordion-body-contact .cart-contact-info {
            margin-bottom: 0;
          }
          .cart-accordion-body-contact .cart-contact-field {
            margin-bottom: 16px;
          }
          .cart-accordion-body-contact .cart-contact-label {
            display: block;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 6px;
          }
          .cart-accordion-body-contact .cart-contact-input {
            width: 100%;
            padding: 12px 14px;
            font-size: 1rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--surface);
            color: var(--text);
            font-family: inherit;
            min-height: 48px;
          }
          .cart-accordion-body-contact .cart-contact-input:focus {
            outline: none;
            border-color: var(--accent);
          }
          .cart-accordion-body-contact .cart-phone-row {
            display: flex;
            align-items: stretch;
            gap: 0;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--surface);
            min-height: 48px;
          }
          .cart-accordion-body-contact .cart-phone-row:focus-within {
            border-color: var(--accent);
          }
          .cart-accordion-body-contact .cart-phone-country-select {
            padding: 12px 14px;
            font-size: 1rem;
            border: none;
            border-right: 1px solid var(--border);
            border-radius: 8px 0 0 8px;
            background: var(--pastel-cream);
            color: var(--text);
            font-family: inherit;
            font-weight: 600;
            cursor: pointer;
          }
          .cart-accordion-body-contact .cart-phone-input {
            flex: 1;
            min-width: 0;
            border: none;
            border-radius: 0 8px 8px 0;
          }
          .cart-accordion-body-contact .cart-section-label {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text);
            margin: 0 0 8px;
          }
          .cart-accordion-body-contact .cart-phone-hint {
            font-size: 0.625rem;
            color: #94a3b8;
            font-weight: normal;
            margin: 0.125rem 0 0;
          }
          .cart-accordion-body-contact .cart-contact-preferences {
            margin: 16px 0 0;
            padding: 0;
            border: none;
          }
          .cart-accordion-body-contact .cart-contact-legend {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 10px;
            display: block;
          }
          .cart-accordion-body-contact .cart-contact-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .cart-accordion-body-contact .cart-contact-chip {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            min-height: 44px;
            background: var(--pastel-cream);
            border: 2px solid var(--border);
            border-radius: var(--radius-sm);
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--text);
            cursor: pointer;
            transition: border-color 0.2s, background 0.2s;
          }
          .cart-accordion-body-contact .cart-contact-chip:hover {
            border-color: var(--accent);
            background: var(--accent-soft);
          }
          .cart-accordion-body-contact .cart-contact-chip-selected {
            border-color: var(--accent);
            background: var(--accent-soft);
          }
          .cart-accordion-body-contact .cart-contact-chip-input {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
            pointer-events: none;
          }
          .cart-accordion-body-contact .cart-contact-chip-box {
            flex-shrink: 0;
            position: relative;
            width: 18px;
            height: 18px;
            border: 2px solid var(--border);
            border-radius: 4px;
            background: var(--surface);
            transition: border-color 0.2s, background 0.2s;
          }
          .cart-accordion-body-contact .cart-contact-chip-selected .cart-contact-chip-box {
            border-color: var(--accent);
            background: var(--accent);
          }
          .cart-accordion-body-contact .cart-contact-chip-selected .cart-contact-chip-box::after {
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
          .cart-accordion-body-contact .cart-contact-chip-label {
            user-select: none;
          }
          .cart-accordion-save-btn {
            width: 100%;
            padding: 14px 20px;
            font-size: 1rem;
            font-weight: 700;
            color: #fff;
            background: var(--accent);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 16px;
            transition: background 0.2s;
          }
          .cart-accordion-save-btn:disabled {
            background: #d1d5db;
            color: #9ca3af;
            cursor: not-allowed;
          }
          .cart-accordion-save-btn:not(:disabled):hover {
            background: #a88b5c;
          }
          .cart-mobile-list {
            margin-bottom: 0;
          }
          .cart-accordion-body-bag .cart-order-summary {
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid var(--border);
          }
          .cart-accordion-body-bag .cart-mobile-summary {
            margin-bottom: 16px;
          }
          .cart-mobile-summary {
            margin-bottom: 16px;
          }
          .cart-mobile-view {
            padding-bottom: calc(165px + env(safe-area-inset-bottom));
          }
        }
      `}</style>
      <style jsx global>{`
        /* Desktop: contact form inside cart-delivery (rendered via DeliveryForm step3Content) - styled-jsx scope doesn't reach here */
        @media (min-width: 1201px) {
          .cart-delivery .cart-place-order {
            margin-top: 0;
            padding: 8px 20px 20px;
            background: var(--pastel-cream, #fdf8f3);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
          }
          .cart-delivery .cart-contact-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px 24px;
            margin-bottom: 24px;
          }
          .cart-delivery .cart-contact-info .cart-section-label {
            grid-column: 1 / -1;
            margin: 0 0 4px;
          }
          .cart-delivery .cart-contact-info .cart-section-label:first-child {
            margin-top: 0;
          }
          .cart-delivery .cart-contact-info .cart-contact-field {
            margin-bottom: 0;
          }
          .cart-delivery .cart-contact-info .cart-contact-field:has(.cart-phone-row) {
            grid-column: 1 / -1;
          }
          .cart-delivery .cart-contact-info .cart-ordering-for-else {
            grid-column: 1 / -1;
            margin-top: 4px;
          }
          .cart-delivery .cart-contact-info .cart-ordering-for-else .cart-ordering-for-else-text {
            margin-left: 5px;
          }
          .cart-delivery .cart-contact-info .cart-contact-preferences {
            grid-column: 1 / -1;
            margin-top: 8px;
          }
          .cart-delivery .cart-place-order-actions {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: flex-end;
            gap: 12px;
          }
          .cart-delivery .cart-place-order-buttons {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 0;
          }
          .cart-delivery .cart-place-order-btn {
            width: auto;
            min-width: 160px;
            max-width: 220px;
          }
          .cart-delivery .cart-place-order-error {
            flex: 1 1 100%;
            order: 2;
          }
          .cart-delivery .cart-contact-label {
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 4px;
          }
          .cart-delivery .cart-contact-input {
            width: 100%;
            padding: 10px 12px;
            font-size: 0.95rem;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            background: var(--surface);
            color: var(--text);
            font-family: inherit;
            box-sizing: border-box;
          }
          .cart-delivery .cart-contact-input:focus {
            outline: none;
            border-color: var(--accent);
          }
          .cart-delivery .cart-phone-row {
            display: flex;
            align-items: stretch;
            gap: 0;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            background: var(--surface);
          }
          .cart-delivery .cart-phone-row:focus-within {
            border-color: var(--accent);
          }
          .cart-delivery .cart-phone-country-select {
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
          .cart-delivery .cart-phone-input {
            flex: 1;
            min-width: 0;
            border: none;
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          }
          .cart-delivery .cart-phone-input:focus {
            outline: none;
            box-shadow: none;
          }
          .cart-delivery .cart-phone-hint {
            font-size: 0.625rem;
            color: #94a3b8;
            font-weight: normal;
            margin: 0.125rem 0 0;
          }
          .cart-delivery .cart-section-label {
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--text);
            margin: 16px 0 8px;
          }
          .cart-delivery .cart-contact-preferences {
            margin: 16px 0 0;
            padding: 0;
            border: none;
          }
          .cart-delivery .cart-contact-legend {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 10px;
          }
          .cart-delivery .cart-contact-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .cart-delivery .cart-contact-chip {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            background: var(--pastel-cream);
            border: 2px solid var(--border);
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text);
            cursor: pointer;
            transition: border-color 0.2s, background 0.2s;
          }
          .cart-delivery .cart-contact-chip:hover {
            border-color: var(--accent);
            background: var(--accent-soft);
          }
          .cart-delivery .cart-contact-chip-selected {
            border-color: var(--accent);
            background: var(--accent-soft);
          }
          .cart-delivery .cart-contact-chip-input {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
            pointer-events: none;
          }
          .cart-delivery .cart-contact-chip-box {
            flex-shrink: 0;
            position: relative;
            width: 18px;
            height: 18px;
            border: 2px solid var(--border);
            border-radius: 4px;
            background: var(--surface);
            transition: border-color 0.2s, background 0.2s;
          }
          .cart-delivery .cart-contact-chip-selected .cart-contact-chip-box {
            border-color: var(--accent);
            background: var(--accent);
          }
          .cart-delivery .cart-contact-chip-selected .cart-contact-chip-box::after {
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
          .cart-delivery .cart-required {
            color: #b91c1c;
          }
        }
        @media (max-width: 1200px) {
          .cart-mobile-contact-fields input.cart-contact-input,
          .cart-mobile-contact-fields .cart-phone-row input {
            width: 100% !important;
            padding: 12px 14px !important;
            font-size: 1rem !important;
            border: 1px solid #ebe6e0 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            color: #2d2a26 !important;
            min-height: 48px !important;
            box-sizing: border-box !important;
          }
          .cart-mobile-contact-fields .cart-phone-row {
            display: flex !important;
            align-items: stretch !important;
            border: 1px solid #ebe6e0 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            min-height: 48px !important;
          }
          .cart-mobile-contact-fields .cart-phone-country-select {
            padding: 12px 14px !important;
            font-size: 1rem !important;
            border: none !important;
            border-right: 1px solid #ebe6e0 !important;
            border-radius: 8px 0 0 8px !important;
            background: #f9f5f0 !important;
            color: #2d2a26 !important;
            min-height: 48px !important;
          }
          .cart-mobile-contact-fields .cart-phone-input {
            flex: 1 !important;
            min-width: 0 !important;
            border: none !important;
            border-radius: 0 8px 8px 0 !important;
          }
          /* Contact preference chips - mobile (global so they apply reliably) */
          .cart-mobile-contact-fields .cart-contact-preferences {
            margin: 16px 0 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          .cart-mobile-contact-fields .cart-contact-legend {
            font-size: 0.9rem !important;
            font-weight: 600 !important;
            color: var(--text-muted) !important;
            margin-bottom: 10px !important;
            display: block !important;
          }
          .cart-mobile-contact-fields .cart-contact-chips {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
          }
          .cart-mobile-contact-fields .cart-contact-chip {
            display: inline-flex !important;
            align-items: center !important;
            gap: 10px !important;
            padding: 12px 16px !important;
            min-height: 44px !important;
            background: var(--pastel-cream) !important;
            border: 2px solid var(--border) !important;
            border-radius: var(--radius-sm) !important;
            font-size: 0.95rem !important;
            font-weight: 600 !important;
            color: var(--text) !important;
            cursor: pointer !important;
            transition: border-color 0.2s, background 0.2s !important;
          }
          .cart-mobile-contact-fields .cart-contact-chip:hover {
            border-color: var(--accent) !important;
            background: var(--accent-soft) !important;
          }
          .cart-mobile-contact-fields .cart-contact-chip-selected {
            border-color: var(--accent) !important;
            background: var(--accent-soft) !important;
          }
          .cart-mobile-contact-fields .cart-contact-chip-input {
            position: absolute !important;
            opacity: 0 !important;
            width: 0 !important;
            height: 0 !important;
            pointer-events: none !important;
          }
          .cart-mobile-contact-fields .cart-contact-chip-box {
            flex-shrink: 0 !important;
            position: relative !important;
            width: 18px !important;
            height: 18px !important;
            border: 2px solid var(--border) !important;
            border-radius: 4px !important;
            background: var(--surface) !important;
            transition: border-color 0.2s, background 0.2s !important;
          }
          .cart-mobile-contact-fields .cart-contact-chip-selected .cart-contact-chip-box {
            border-color: var(--accent) !important;
            background: var(--accent) !important;
          }
          .cart-mobile-contact-fields .cart-contact-chip-selected .cart-contact-chip-box::after {
            content: '✓' !important;
            position: absolute !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            color: #fff !important;
            line-height: 1 !important;
          }
          .cart-mobile-contact-fields .cart-ordering-for-else .cart-ordering-for-else-text {
            margin-left: 5px !important;
          }
        }
      `}</style>
    </div>
  );
}
