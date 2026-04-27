'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { DeliveryForm, DELIVERY_TIME_SLOTS, type DeliveryFormValues } from '@/components/DeliveryForm';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { ContactPreferenceOption } from '@/lib/orders';
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
import { buildStripeCheckoutSessionRequestBody } from '@/lib/checkout/buildStripeCheckoutSessionBody';
import { getAddOnsTotal } from '@/lib/addonsConfig';
import { OrderLookupSection } from '@/components/OrderLookupSection';
import {
  CHECKOUT_COMPLETED_SUBMISSION_TOKEN_SESSION_KEY,
  CHECKOUT_SUBMISSION_TOKEN_SESSION_KEY,
  validateSubmissionTokenFormat,
} from '@/lib/checkout/submissionToken';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';
import { getLocalTodayYmd } from '@/lib/localDateYmd';
import { PinIcon } from '@/components/icons/PinIcon';
import {
  CHECKOUT_NATIONAL_MAX,
  getNationalPhoneHint,
  normalizeNationalPhoneOnBlur,
  nationalDigitsValidForCheckout,
} from '@/lib/phoneFieldHints';

/** Non-flower catalog lines (partner products or standalone add-ons). */
function isNonBouquetCartLine(item: CartItem): boolean {
  return item.itemType === 'product' || item.itemType === 'plushyToy' || item.itemType === 'balloon';
}

/** Format YYYY-MM-DD to DD MMM for display (e.g. 2026-03-10 → 10 Mar). */
function formatStickyDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr + 'T12:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en', { month: 'short' });
  return `${day} ${month}`;
}

function balloonTextLabel(t: { balloonTextLabel?: string }): string {
  return t.balloonTextLabel ?? 'Balloon text';
}

/** Balloon custom text is shown on cart so customers can review it before checkout. */
function buildAddOnsSummaryForDisplay(item: CartItem, t: { balloonTextLabel?: string }): string {
  const balloonText = item.itemType === 'balloon' ? item.addOns?.balloonText?.trim() : '';
  return balloonText ? `${balloonTextLabel(t)}: "${balloonText}"` : '';
}

function buildAddOnsSummaryLines(item: CartItem, t: { balloonTextLabel?: string }): string[] {
  const balloonText = item.itemType === 'balloon' ? item.addOns?.balloonText?.trim() : '';
  return balloonText ? [`${balloonTextLabel(t)}: "${balloonText}"`] : [];
}

const CONTACT_OPTIONS: ContactPreferenceOption[] = ['phone', 'line', 'whatsapp'];

const CART_FORM_STORAGE_KEY = 'lanna-bloom-cart-form';
const PREFERRED_DELIVERY_KEY = 'lanna-bloom-preferred-delivery-date';
const PREFERRED_TIME_KEY = 'lanna-bloom-preferred-delivery-time';

function getProductPageDeliveryPreference(): { date: string; timeSlot: string } {
  if (typeof window === 'undefined') return { date: '', timeSlot: '' };
  const todayStr = getLocalTodayYmd();
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
  surpriseDelivery?: boolean;
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

const PHONE_MAX_DIGITS = CHECKOUT_NATIONAL_MAX;

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
  countryCode: string,
  phoneNational: string,
  contactPreference: ContactPreferenceOption[],
  customerEmail: string,
  isOrderingForSomeoneElse: boolean,
  recipientName: string,
  recipientCountryCode: string,
  recipientPhoneNational: string,
  _t: Record<string, string | number>
): boolean {
  if (!customerName.trim()) return false;
  if (!nationalDigitsValidForCheckout(countryCode, phoneNational)) return false;
  if (contactPreference.length === 0) return false;
  if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) return false;
  if (isOrderingForSomeoneElse) {
    if (!recipientName.trim() || !recipientPhoneNational) return false;
    if (!nationalDigitsValidForCheckout(recipientCountryCode, recipientPhoneNational)) return false;
  }
  return true;
}

/**
 * Country dial codes. `id` is the ISO alpha-2 (unique React key); `code` is the
 * E.164 dial code actually submitted with the phone (multiple countries can share
 * a code, e.g. US/CA both use "1", which is fine for the server).
 */
type CountryCodeEntry = { id: string; code: string; label: string };

const POPULAR_COUNTRY_CODES: CountryCodeEntry[] = [
  { id: 'TH', code: '66', label: '🇹🇭 Thailand (+66)' },
  { id: 'MM', code: '95', label: '🇲🇲 Myanmar (+95)' },
  { id: 'LA', code: '856', label: '🇱🇦 Laos (+856)' },
  { id: 'KH', code: '855', label: '🇰🇭 Cambodia (+855)' },
  { id: 'VN', code: '84', label: '🇻🇳 Vietnam (+84)' },
  { id: 'MY', code: '60', label: '🇲🇾 Malaysia (+60)' },
  { id: 'SG', code: '65', label: '🇸🇬 Singapore (+65)' },
  { id: 'ID', code: '62', label: '🇮🇩 Indonesia (+62)' },
  { id: 'PH', code: '63', label: '🇵🇭 Philippines (+63)' },
  { id: 'US', code: '1', label: '🇺🇸 United States (+1)' },
  { id: 'GB', code: '44', label: '🇬🇧 United Kingdom (+44)' },
  { id: 'JP', code: '81', label: '🇯🇵 Japan (+81)' },
];

/** Alphabetical by country name. IDs of countries already in "Popular" are omitted. */
const ALL_COUNTRY_CODES: CountryCodeEntry[] = [
  { id: 'AF', code: '93', label: '🇦🇫 Afghanistan (+93)' },
  { id: 'AL', code: '355', label: '🇦🇱 Albania (+355)' },
  { id: 'DZ', code: '213', label: '🇩🇿 Algeria (+213)' },
  { id: 'AD', code: '376', label: '🇦🇩 Andorra (+376)' },
  { id: 'AO', code: '244', label: '🇦🇴 Angola (+244)' },
  { id: 'AG', code: '1', label: '🇦🇬 Antigua and Barbuda (+1)' },
  { id: 'AR', code: '54', label: '🇦🇷 Argentina (+54)' },
  { id: 'AM', code: '374', label: '🇦🇲 Armenia (+374)' },
  { id: 'AU', code: '61', label: '🇦🇺 Australia (+61)' },
  { id: 'AT', code: '43', label: '🇦🇹 Austria (+43)' },
  { id: 'AZ', code: '994', label: '🇦🇿 Azerbaijan (+994)' },
  { id: 'BS', code: '1', label: '🇧🇸 Bahamas (+1)' },
  { id: 'BH', code: '973', label: '🇧🇭 Bahrain (+973)' },
  { id: 'BD', code: '880', label: '🇧🇩 Bangladesh (+880)' },
  { id: 'BB', code: '1', label: '🇧🇧 Barbados (+1)' },
  { id: 'BY', code: '375', label: '🇧🇾 Belarus (+375)' },
  { id: 'BE', code: '32', label: '🇧🇪 Belgium (+32)' },
  { id: 'BZ', code: '501', label: '🇧🇿 Belize (+501)' },
  { id: 'BJ', code: '229', label: '🇧🇯 Benin (+229)' },
  { id: 'BT', code: '975', label: '🇧🇹 Bhutan (+975)' },
  { id: 'BO', code: '591', label: '🇧🇴 Bolivia (+591)' },
  { id: 'BA', code: '387', label: '🇧🇦 Bosnia and Herzegovina (+387)' },
  { id: 'BW', code: '267', label: '🇧🇼 Botswana (+267)' },
  { id: 'BR', code: '55', label: '🇧🇷 Brazil (+55)' },
  { id: 'BN', code: '673', label: '🇧🇳 Brunei (+673)' },
  { id: 'BG', code: '359', label: '🇧🇬 Bulgaria (+359)' },
  { id: 'BF', code: '226', label: '🇧🇫 Burkina Faso (+226)' },
  { id: 'BI', code: '257', label: '🇧🇮 Burundi (+257)' },
  { id: 'CV', code: '238', label: '🇨🇻 Cabo Verde (+238)' },
  { id: 'CM', code: '237', label: '🇨🇲 Cameroon (+237)' },
  { id: 'CA', code: '1', label: '🇨🇦 Canada (+1)' },
  { id: 'CF', code: '236', label: '🇨🇫 Central African Republic (+236)' },
  { id: 'TD', code: '235', label: '🇹🇩 Chad (+235)' },
  { id: 'CL', code: '56', label: '🇨🇱 Chile (+56)' },
  { id: 'CN', code: '86', label: '🇨🇳 China (+86)' },
  { id: 'CO', code: '57', label: '🇨🇴 Colombia (+57)' },
  { id: 'KM', code: '269', label: '🇰🇲 Comoros (+269)' },
  { id: 'CG', code: '242', label: '🇨🇬 Congo (+242)' },
  { id: 'CD', code: '243', label: '🇨🇩 Congo (DRC) (+243)' },
  { id: 'CR', code: '506', label: '🇨🇷 Costa Rica (+506)' },
  { id: 'CI', code: '225', label: '🇨🇮 Côte d’Ivoire (+225)' },
  { id: 'HR', code: '385', label: '🇭🇷 Croatia (+385)' },
  { id: 'CU', code: '53', label: '🇨🇺 Cuba (+53)' },
  { id: 'CY', code: '357', label: '🇨🇾 Cyprus (+357)' },
  { id: 'CZ', code: '420', label: '🇨🇿 Czechia (+420)' },
  { id: 'DK', code: '45', label: '🇩🇰 Denmark (+45)' },
  { id: 'DJ', code: '253', label: '🇩🇯 Djibouti (+253)' },
  { id: 'DM', code: '1', label: '🇩🇲 Dominica (+1)' },
  { id: 'DO', code: '1', label: '🇩🇴 Dominican Republic (+1)' },
  { id: 'EC', code: '593', label: '🇪🇨 Ecuador (+593)' },
  { id: 'EG', code: '20', label: '🇪🇬 Egypt (+20)' },
  { id: 'SV', code: '503', label: '🇸🇻 El Salvador (+503)' },
  { id: 'GQ', code: '240', label: '🇬🇶 Equatorial Guinea (+240)' },
  { id: 'ER', code: '291', label: '🇪🇷 Eritrea (+291)' },
  { id: 'EE', code: '372', label: '🇪🇪 Estonia (+372)' },
  { id: 'SZ', code: '268', label: '🇸🇿 Eswatini (+268)' },
  { id: 'ET', code: '251', label: '🇪🇹 Ethiopia (+251)' },
  { id: 'FJ', code: '679', label: '🇫🇯 Fiji (+679)' },
  { id: 'FI', code: '358', label: '🇫🇮 Finland (+358)' },
  { id: 'FR', code: '33', label: '🇫🇷 France (+33)' },
  { id: 'GA', code: '241', label: '🇬🇦 Gabon (+241)' },
  { id: 'GM', code: '220', label: '🇬🇲 Gambia (+220)' },
  { id: 'GE', code: '995', label: '🇬🇪 Georgia (+995)' },
  { id: 'DE', code: '49', label: '🇩🇪 Germany (+49)' },
  { id: 'GH', code: '233', label: '🇬🇭 Ghana (+233)' },
  { id: 'GR', code: '30', label: '🇬🇷 Greece (+30)' },
  { id: 'GD', code: '1', label: '🇬🇩 Grenada (+1)' },
  { id: 'GT', code: '502', label: '🇬🇹 Guatemala (+502)' },
  { id: 'GN', code: '224', label: '🇬🇳 Guinea (+224)' },
  { id: 'GW', code: '245', label: '🇬🇼 Guinea-Bissau (+245)' },
  { id: 'GY', code: '592', label: '🇬🇾 Guyana (+592)' },
  { id: 'HT', code: '509', label: '🇭🇹 Haiti (+509)' },
  { id: 'HN', code: '504', label: '🇭🇳 Honduras (+504)' },
  { id: 'HK', code: '852', label: '🇭🇰 Hong Kong (+852)' },
  { id: 'HU', code: '36', label: '🇭🇺 Hungary (+36)' },
  { id: 'IS', code: '354', label: '🇮🇸 Iceland (+354)' },
  { id: 'IN', code: '91', label: '🇮🇳 India (+91)' },
  { id: 'IR', code: '98', label: '🇮🇷 Iran (+98)' },
  { id: 'IQ', code: '964', label: '🇮🇶 Iraq (+964)' },
  { id: 'IE', code: '353', label: '🇮🇪 Ireland (+353)' },
  { id: 'IL', code: '972', label: '🇮🇱 Israel (+972)' },
  { id: 'IT', code: '39', label: '🇮🇹 Italy (+39)' },
  { id: 'JM', code: '1', label: '🇯🇲 Jamaica (+1)' },
  { id: 'JO', code: '962', label: '🇯🇴 Jordan (+962)' },
  { id: 'KZ', code: '7', label: '🇰🇿 Kazakhstan (+7)' },
  { id: 'KE', code: '254', label: '🇰🇪 Kenya (+254)' },
  { id: 'KI', code: '686', label: '🇰🇮 Kiribati (+686)' },
  { id: 'KR', code: '82', label: '🇰🇷 Korea, South (+82)' },
  { id: 'KP', code: '850', label: '🇰🇵 Korea, North (+850)' },
  { id: 'KW', code: '965', label: '🇰🇼 Kuwait (+965)' },
  { id: 'KG', code: '996', label: '🇰🇬 Kyrgyzstan (+996)' },
  { id: 'LV', code: '371', label: '🇱🇻 Latvia (+371)' },
  { id: 'LB', code: '961', label: '🇱🇧 Lebanon (+961)' },
  { id: 'LS', code: '266', label: '🇱🇸 Lesotho (+266)' },
  { id: 'LR', code: '231', label: '🇱🇷 Liberia (+231)' },
  { id: 'LY', code: '218', label: '🇱🇾 Libya (+218)' },
  { id: 'LI', code: '423', label: '🇱🇮 Liechtenstein (+423)' },
  { id: 'LT', code: '370', label: '🇱🇹 Lithuania (+370)' },
  { id: 'LU', code: '352', label: '🇱🇺 Luxembourg (+352)' },
  { id: 'MO', code: '853', label: '🇲🇴 Macau (+853)' },
  { id: 'MG', code: '261', label: '🇲🇬 Madagascar (+261)' },
  { id: 'MW', code: '265', label: '🇲🇼 Malawi (+265)' },
  { id: 'MV', code: '960', label: '🇲🇻 Maldives (+960)' },
  { id: 'ML', code: '223', label: '🇲🇱 Mali (+223)' },
  { id: 'MT', code: '356', label: '🇲🇹 Malta (+356)' },
  { id: 'MH', code: '692', label: '🇲🇭 Marshall Islands (+692)' },
  { id: 'MR', code: '222', label: '🇲🇷 Mauritania (+222)' },
  { id: 'MU', code: '230', label: '🇲🇺 Mauritius (+230)' },
  { id: 'MX', code: '52', label: '🇲🇽 Mexico (+52)' },
  { id: 'FM', code: '691', label: '🇫🇲 Micronesia (+691)' },
  { id: 'MD', code: '373', label: '🇲🇩 Moldova (+373)' },
  { id: 'MC', code: '377', label: '🇲🇨 Monaco (+377)' },
  { id: 'MN', code: '976', label: '🇲🇳 Mongolia (+976)' },
  { id: 'ME', code: '382', label: '🇲🇪 Montenegro (+382)' },
  { id: 'MA', code: '212', label: '🇲🇦 Morocco (+212)' },
  { id: 'MZ', code: '258', label: '🇲🇿 Mozambique (+258)' },
  { id: 'NA', code: '264', label: '🇳🇦 Namibia (+264)' },
  { id: 'NR', code: '674', label: '🇳🇷 Nauru (+674)' },
  { id: 'NP', code: '977', label: '🇳🇵 Nepal (+977)' },
  { id: 'NL', code: '31', label: '🇳🇱 Netherlands (+31)' },
  { id: 'NZ', code: '64', label: '🇳🇿 New Zealand (+64)' },
  { id: 'NI', code: '505', label: '🇳🇮 Nicaragua (+505)' },
  { id: 'NE', code: '227', label: '🇳🇪 Niger (+227)' },
  { id: 'NG', code: '234', label: '🇳🇬 Nigeria (+234)' },
  { id: 'MK', code: '389', label: '🇲🇰 North Macedonia (+389)' },
  { id: 'NO', code: '47', label: '🇳🇴 Norway (+47)' },
  { id: 'OM', code: '968', label: '🇴🇲 Oman (+968)' },
  { id: 'PK', code: '92', label: '🇵🇰 Pakistan (+92)' },
  { id: 'PW', code: '680', label: '🇵🇼 Palau (+680)' },
  { id: 'PS', code: '970', label: '🇵🇸 Palestine (+970)' },
  { id: 'PA', code: '507', label: '🇵🇦 Panama (+507)' },
  { id: 'PG', code: '675', label: '🇵🇬 Papua New Guinea (+675)' },
  { id: 'PY', code: '595', label: '🇵🇾 Paraguay (+595)' },
  { id: 'PE', code: '51', label: '🇵🇪 Peru (+51)' },
  { id: 'PL', code: '48', label: '🇵🇱 Poland (+48)' },
  { id: 'PT', code: '351', label: '🇵🇹 Portugal (+351)' },
  { id: 'PR', code: '1', label: '🇵🇷 Puerto Rico (+1)' },
  { id: 'QA', code: '974', label: '🇶🇦 Qatar (+974)' },
  { id: 'RO', code: '40', label: '🇷🇴 Romania (+40)' },
  { id: 'RU', code: '7', label: '🇷🇺 Russia (+7)' },
  { id: 'RW', code: '250', label: '🇷🇼 Rwanda (+250)' },
  { id: 'KN', code: '1', label: '🇰🇳 Saint Kitts and Nevis (+1)' },
  { id: 'LC', code: '1', label: '🇱🇨 Saint Lucia (+1)' },
  { id: 'VC', code: '1', label: '🇻🇨 Saint Vincent and the Grenadines (+1)' },
  { id: 'WS', code: '685', label: '🇼🇸 Samoa (+685)' },
  { id: 'SM', code: '378', label: '🇸🇲 San Marino (+378)' },
  { id: 'ST', code: '239', label: '🇸🇹 São Tomé and Príncipe (+239)' },
  { id: 'SA', code: '966', label: '🇸🇦 Saudi Arabia (+966)' },
  { id: 'SN', code: '221', label: '🇸🇳 Senegal (+221)' },
  { id: 'RS', code: '381', label: '🇷🇸 Serbia (+381)' },
  { id: 'SC', code: '248', label: '🇸🇨 Seychelles (+248)' },
  { id: 'SL', code: '232', label: '🇸🇱 Sierra Leone (+232)' },
  { id: 'SK', code: '421', label: '🇸🇰 Slovakia (+421)' },
  { id: 'SI', code: '386', label: '🇸🇮 Slovenia (+386)' },
  { id: 'SB', code: '677', label: '🇸🇧 Solomon Islands (+677)' },
  { id: 'SO', code: '252', label: '🇸🇴 Somalia (+252)' },
  { id: 'ZA', code: '27', label: '🇿🇦 South Africa (+27)' },
  { id: 'SS', code: '211', label: '🇸🇸 South Sudan (+211)' },
  { id: 'ES', code: '34', label: '🇪🇸 Spain (+34)' },
  { id: 'LK', code: '94', label: '🇱🇰 Sri Lanka (+94)' },
  { id: 'SD', code: '249', label: '🇸🇩 Sudan (+249)' },
  { id: 'SR', code: '597', label: '🇸🇷 Suriname (+597)' },
  { id: 'SE', code: '46', label: '🇸🇪 Sweden (+46)' },
  { id: 'CH', code: '41', label: '🇨🇭 Switzerland (+41)' },
  { id: 'SY', code: '963', label: '🇸🇾 Syria (+963)' },
  { id: 'TW', code: '886', label: '🇹🇼 Taiwan (+886)' },
  { id: 'TJ', code: '992', label: '🇹🇯 Tajikistan (+992)' },
  { id: 'TZ', code: '255', label: '🇹🇿 Tanzania (+255)' },
  { id: 'TL', code: '670', label: '🇹🇱 Timor-Leste (+670)' },
  { id: 'TG', code: '228', label: '🇹🇬 Togo (+228)' },
  { id: 'TO', code: '676', label: '🇹🇴 Tonga (+676)' },
  { id: 'TT', code: '1', label: '🇹🇹 Trinidad and Tobago (+1)' },
  { id: 'TN', code: '216', label: '🇹🇳 Tunisia (+216)' },
  { id: 'TR', code: '90', label: '🇹🇷 Turkey (+90)' },
  { id: 'TM', code: '993', label: '🇹🇲 Turkmenistan (+993)' },
  { id: 'TV', code: '688', label: '🇹🇻 Tuvalu (+688)' },
  { id: 'UG', code: '256', label: '🇺🇬 Uganda (+256)' },
  { id: 'UA', code: '380', label: '🇺🇦 Ukraine (+380)' },
  { id: 'AE', code: '971', label: '🇦🇪 United Arab Emirates (+971)' },
  { id: 'UY', code: '598', label: '🇺🇾 Uruguay (+598)' },
  { id: 'UZ', code: '998', label: '🇺🇿 Uzbekistan (+998)' },
  { id: 'VU', code: '678', label: '🇻🇺 Vanuatu (+678)' },
  { id: 'VA', code: '39', label: '🇻🇦 Vatican City (+39)' },
  { id: 'VE', code: '58', label: '🇻🇪 Venezuela (+58)' },
  { id: 'YE', code: '967', label: '🇾🇪 Yemen (+967)' },
  { id: 'ZM', code: '260', label: '🇿🇲 Zambia (+260)' },
  { id: 'ZW', code: '263', label: '🇿🇼 Zimbabwe (+263)' },
];

function renderCountryCodeOptions(lang: Locale): ReactNode {
  const popularLabel = lang === 'th' ? 'ประเทศยอดนิยม' : 'Popular';
  const allLabel = lang === 'th' ? 'ประเทศอื่น ๆ (เรียงตามตัวอักษร)' : 'All countries (A–Z)';
  return (
    <>
      <optgroup label={popularLabel}>
        {POPULAR_COUNTRY_CODES.map((c) => (
          <option key={c.id} value={c.code}>{c.label}</option>
        ))}
      </optgroup>
      <optgroup label={allLabel}>
        {ALL_COUNTRY_CODES.map((c) => (
          <option key={c.id} value={c.code}>{c.label}</option>
        ))}
      </optgroup>
    </>
  );
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
  const viewCartFiredRef = useRef(false);
  const addShippingInfoFiredRef = useRef(false);
  const orderSubmitInFlightRef = useRef(false);

  const [checkoutSubmissionToken, setCheckoutSubmissionToken] = useState<string | null>(null);
  const [alreadySubmittedBlock, setAlreadySubmittedBlock] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const analyticsItems = cartItemsToAnalytics(items, lang);
    const value = cartValue(items);
    if (!viewCartFiredRef.current) {
      viewCartFiredRef.current = true;
      trackViewCart(analyticsItems, value);
    }
    // begin_checkout: funnel start when user reaches cart (e.g. "Go to cart"); deduped per session in lib/analytics.
    trackBeginCheckout({
      currency: 'THB',
      value,
      items: analyticsItems,
    });
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
    const validDistrict = d.deliveryDistrict && ['MUEANG','SARAPHI','SAN_SAI','HANG_DONG','SAN_KAMPHAENG','MAE_RIM','DOI_SAKET','MAE_ON','SAMOENG','MAE_TAENG','LAMPHUN','UNKNOWN'].includes(d.deliveryDistrict)
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
  const [orderError, setOrderError] = useState<string | null>(null);
  const [mapsLinkPromptOpen, setMapsLinkPromptOpen] = useState(false);
  const [shouldFocusMapsLinkOnReturn, setShouldFocusMapsLinkOnReturn] = useState(false);
  const [referralCleared, setReferralCleared] = useState(0);
  const [customerName, setCustomerName] = useState(() => loadCartFormFromStorage()?.customerName ?? '');
  const [customerEmail, setCustomerEmail] = useState(() => loadCartFormFromStorage()?.customerEmail ?? '');
  const [countryCode, setCountryCode] = useState(() => loadCartFormFromStorage()?.countryCode ?? '66');
  const [phoneNational, setPhoneNational] = useState(() => loadCartFormFromStorage()?.phoneNational ?? '');
  const [recipientName, setRecipientName] = useState(() => loadCartFormFromStorage()?.recipientName ?? '');
  const [recipientCountryCode, setRecipientCountryCode] = useState(() => loadCartFormFromStorage()?.recipientCountryCode ?? '66');
  const [recipientPhoneNational, setRecipientPhoneNational] = useState(() => loadCartFormFromStorage()?.recipientPhoneNational ?? '');
  const [isOrderingForSomeoneElse, setIsOrderingForSomeoneElse] = useState(() => loadCartFormFromStorage()?.isOrderingForSomeoneElse ?? false);
  const [surpriseDelivery, setSurpriseDelivery] = useState(() => loadCartFormFromStorage()?.surpriseDelivery ?? false);
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

  // Hide the site footer on desktop cart, and on mobile whenever the cart has items (checkout flow).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(min-width: 1201px)'); // matches cart desktop breakpoint
    const hideOnThisPage = () => {
      const shouldHide = mql.matches || items.length > 0;
      document.body.classList.toggle('hide-checkout-footer', shouldHide);
    };

    hideOnThisPage();
    if (mql.addEventListener) mql.addEventListener('change', hideOnThisPage);
    else mql.addListener(hideOnThisPage);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', hideOnThisPage);
      else mql.removeListener(hideOnThisPage);
      document.body.classList.remove('hide-checkout-footer');
    };
  }, [items.length]);

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
      surpriseDelivery,
    });
  }, [items.length, delivery, customerName, customerEmail, countryCode, phoneNational, recipientName, recipientCountryCode, recipientPhoneNational, contactPreference, isOrderingForSomeoneElse, surpriseDelivery]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = sessionStorage.getItem(CHECKOUT_COMPLETED_SUBMISSION_TOKEN_SESSION_KEY);
    const current = sessionStorage.getItem(CHECKOUT_SUBMISSION_TOKEN_SESSION_KEY);
    if (completed && current && completed === current) {
      setAlreadySubmittedBlock(true);
      setCheckoutSubmissionToken(current);
      return;
    }
    setAlreadySubmittedBlock(false);
    if (items.length === 0) {
      setCheckoutSubmissionToken(null);
      return;
    }
    let token = sessionStorage.getItem(CHECKOUT_SUBMISSION_TOKEN_SESSION_KEY);
    if (!token || !validateSubmissionTokenFormat(token)) {
      token = crypto.randomUUID();
      try {
        sessionStorage.setItem(CHECKOUT_SUBMISSION_TOKEN_SESSION_KEY, token);
      } catch {
        // ignore
      }
    }
    setCheckoutSubmissionToken(token);
  }, [items.length]);

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
  const isContactValidNow = isContactValid(
    customerName,
    countryCode,
    phoneNational,
    contactPreference,
    customerEmail,
    isOrderingForSomeoneElse,
    recipientName,
    recipientCountryCode,
    recipientPhoneNational,
    t as Record<string, string | number>
  );
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
    if (!nationalDigitsValidForCheckout(countryCode, phoneNational)) {
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
      if (!nationalDigitsValidForCheckout(recipientCountryCode, recipientPhoneNational)) {
        return fmt(String(tC.recipientPhone ?? 'Recipient phone'));
      }
    }
    return '';
  };

  /** Same copy as StickyCheckoutBar incompleteHint — shown on desktop Place Order hover (native title). */
  const preparingCheckoutMsg =
    lang === 'th' ? 'กำลังเตรียมการชำระเงิน…' : 'Preparing checkout…';
  const paymentAvailabilityDesktopBase = getPaymentAvailability({
    hasDeliveryDistrict: !!delivery.deliveryDistrict,
    isFormValid: isPaymentUnlocked,
    isLoading: placing,
    firstIncompleteHint: getFirstIncompleteHint(),
    messages: {
      selectDeliveryArea:
        lang === 'th'
          ? 'กรุณาเลือกพื้นที่จัดส่งเพื่อดูตัวเลือกชำระเงิน'
          : 'Select a delivery area to see payment options',
      processing: lang === 'th' ? 'กำลังดำเนินการ...' : 'Processing...',
    },
  });
  const paymentAvailabilityDesktop =
    checkoutSubmissionToken || items.length === 0
      ? paymentAvailabilityDesktopBase
      : {
          stripe: { enabled: false, reason: preparingCheckoutMsg },
        };

  /** Same priority as StickyCheckoutBar (orderError ?? incompleteHint). */
  const desktopCheckoutHintMessage =
    orderError ??
    (!paymentAvailabilityDesktop.stripe.enabled
      ? paymentAvailabilityDesktop.stripe.reason
      : null) ??
    null;
  const isDesktopCheckoutHintError = Boolean(orderError);

  const [desktopHintDisplay, setDesktopHintDisplay] = useState<{
    text: string;
    isError: boolean;
  } | null>(() =>
    desktopCheckoutHintMessage
      ? { text: desktopCheckoutHintMessage, isError: isDesktopCheckoutHintError }
      : null
  );
  const [desktopHintAnimOpen, setDesktopHintAnimOpen] = useState(() =>
    Boolean(desktopCheckoutHintMessage)
  );

  useEffect(() => {
    if (!desktopCheckoutHintMessage) {
      setDesktopHintAnimOpen(false);
      return;
    }
    setDesktopHintDisplay({
      text: desktopCheckoutHintMessage,
      isError: isDesktopCheckoutHintError,
    });
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDesktopHintAnimOpen(true));
    });
    return () => cancelAnimationFrame(id);
  }, [desktopCheckoutHintMessage, isDesktopCheckoutHintError]);

  const handleDesktopCheckoutHintTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.propertyName !== 'max-height') return;
      if (!desktopHintAnimOpen && !desktopCheckoutHintMessage) {
        setDesktopHintDisplay(null);
      }
    },
    [desktopHintAnimOpen, desktopCheckoutHintMessage]
  );

  useEffect(() => {
    if (!orderError) return;
    const t = setTimeout(() => setOrderError(null), 5000);
    return () => clearTimeout(t);
  }, [orderError]);

  useEffect(() => {
    if (!mapsLinkPromptOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMapsLinkPromptOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [mapsLinkPromptOpen]);

  useEffect(() => {
    if (!shouldFocusMapsLinkOnReturn) return;
    if (!mapsLinkPromptOpen) return;
    if (typeof window === 'undefined') return;

    const focusMapsInput = () => {
      const mapsUrl = delivery.deliveryGoogleMapsUrl?.trim() ?? '';
      if (mapsUrl) {
        setShouldFocusMapsLinkOnReturn(false);
        return;
      }
      setMobileOpenSection('delivery');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // While the prompt is open, keep user at top.
    focusMapsInput();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') focusMapsInput();
    }, 800);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [shouldFocusMapsLinkOnReturn, mapsLinkPromptOpen, delivery.deliveryGoogleMapsUrl]);

  const toggleMobileSection = (section: AccordionSection) => {
    setMobileOpenSection((prev) => (prev === section ? null : section));
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
    if (
      !isContactValid(
        customerName,
        countryCode,
        phoneNational,
        contactPreference,
        customerEmail,
        isOrderingForSomeoneElse,
        recipientName,
        recipientCountryCode,
        recipientPhoneNational,
        t as Record<string, string | number>
      )
    )
      return;
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

  const handleStartNewCheckout = () => {
    if (typeof window === 'undefined') return;
    const newToken = crypto.randomUUID();
    try {
      sessionStorage.removeItem(CHECKOUT_COMPLETED_SUBMISSION_TOKEN_SESSION_KEY);
      sessionStorage.setItem(CHECKOUT_SUBMISSION_TOKEN_SESSION_KEY, newToken);
    } catch {
      // ignore
    }
    setCheckoutSubmissionToken(newToken);
    setAlreadySubmittedBlock(false);
  };

  const mapsUrlInvalidMsg =
    lang === 'th'
      ? 'กรุณาวางลิงก์ Google Maps ที่ถูกต้อง (แชร์ → คัดลอกลิงก์จากแอป)'
      : 'Please paste a valid Google Maps link (Share → Copy link from the Google Maps app).';

  const runStripeCheckoutSubmit = async () => {
    if (!checkoutSubmissionToken) {
      setOrderError(
        lang === 'th' ? 'กรุณารีเฟรชหน้าแล้วลองอีกครั้ง' : 'Please refresh the page and try again.'
      );
      return;
    }
    if (orderSubmitInFlightRef.current || placing) return;
    orderSubmitInFlightRef.current = true;
    setOrderError(null);
    setPlacing(true);
    const fullPhone = countryCode + phoneNational;
    const recipientPhone = isOrderingForSomeoneElse ? recipientCountryCode + recipientPhoneNational : undefined;
    try {
      const analyticsItems = cartItemsToAnalytics(items, lang);
      trackAddPaymentInfo({
        paymentType: 'card',
        currency: 'THB',
        value: grandTotalVal,
        items: analyticsItems,
      });

      const body = buildStripeCheckoutSessionRequestBody({
        lang,
        cartItems: items,
        delivery,
        customerName: customerName.trim(),
        phone: fullPhone,
        customerEmail: customerEmail.trim() || undefined,
        contactPreference,
        submissionToken: checkoutSubmissionToken,
        ...(isOrderingForSomeoneElse && {
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone!,
          surpriseDelivery,
        }),
      });

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setOrderError(
          typeof data.error === 'string' && data.error.trim()
            ? data.error
            : t.couldNotCreateOrder
        );
        setPlacing(false);
        orderSubmitInFlightRef.current = false;
        return;
      }
      if (typeof data.url === 'string' && data.url.trim()) {
        window.location.href = data.url.trim();
        return;
      }
      setOrderError(t.couldNotCreateOrder);
      setPlacing(false);
      orderSubmitInFlightRef.current = false;
    } catch {
      setOrderError(t.couldNotCreateOrder);
      setPlacing(false);
      orderSubmitInFlightRef.current = false;
    }
  };

  const handlePlaceOrder = async () => {
    const hint = getFirstIncompleteHint();
    if (hint) {
      setOrderError(hint);
      return;
    }
    if (!checkoutSubmissionToken) {
      setOrderError(
        lang === 'th' ? 'กรุณารีเฟรชหน้าแล้วลองอีกครั้ง' : 'Please refresh the page and try again.'
      );
      return;
    }
    const mapsUrl = delivery.deliveryGoogleMapsUrl?.trim() ?? '';
    if (mapsUrl && !isValidGoogleMapsUrl(mapsUrl)) {
      setOrderError(mapsUrlInvalidMsg);
      return;
    }
    if (!mapsUrl) {
      // Scroll to top first, then show the nudge modal.
      setMobileOpenSection('delivery');
      setShouldFocusMapsLinkOnReturn(true);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      requestAnimationFrame(() => setMapsLinkPromptOpen(true));
      return;
    }
    await runStripeCheckoutSubmit();
  };

  const handleMapsPromptContinueWithoutLink = async () => {
    setMapsLinkPromptOpen(false);
    const hint = getFirstIncompleteHint();
    if (hint) {
      setOrderError(hint);
      return;
    }
    if (!checkoutSubmissionToken) {
      setOrderError(
        lang === 'th' ? 'กรุณารีเฟรชหน้าแล้วลองอีกครั้ง' : 'Please refresh the page and try again.'
      );
      return;
    }
    const mapsUrl = delivery.deliveryGoogleMapsUrl?.trim() ?? '';
    if (mapsUrl && !isValidGoogleMapsUrl(mapsUrl)) {
      setOrderError(mapsUrlInvalidMsg);
      return;
    }
    await runStripeCheckoutSubmit();
  };

  const handleMapsPromptAddPin = () => {
    setMapsLinkPromptOpen(false);
    setMobileOpenSection('delivery');
    setShouldFocusMapsLinkOnReturn(true);
    const focusMapsInput = () => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    focusMapsInput();
    if (typeof window !== 'undefined') {
      window.open('https://www.google.com/maps', '_blank', 'noopener,noreferrer');
    }
    // Ensure the user lands back on the correct input even if layout shifts.
    setTimeout(focusMapsInput, 250);
  };

  if (alreadySubmittedBlock) {
    const lastOrderId =
      typeof window !== 'undefined' ? window.localStorage.getItem('lanna-bloom-last-order-id') : null;
    const th = lang === 'th';
    return (
      <div className="cart-page" style={{ padding: '48px 20px' }}>
        <div className="container" style={{ maxWidth: 480 }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.75rem',
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            {th ? 'ส่งคำสั่งซื้อนี้แล้ว' : 'This order was already submitted'}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
            {th
              ? 'คุณได้ส่งคำสั่งซื้อนี้แล้ว หากต้องการสั่งใหม่ โปรดเริ่มคำสั่งซื้อใหม่'
              : 'You already submitted this checkout. To place another order, start a new checkout.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lastOrderId && (
              <Link
                href={`/order/${encodeURIComponent(lastOrderId)}`}
                className="btn-primary"
                style={{ textAlign: 'center', padding: '14px 20px', fontWeight: 600 }}
              >
                {th ? 'ดูคำสั่งซื้อ' : 'View order'}
              </Link>
            )}
            <button
              type="button"
              onClick={handleStartNewCheckout}
              style={{
                padding: '14px 20px',
                fontWeight: 600,
                border: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              {th ? 'เริ่มคำสั่งซื้อใหม่' : 'Start a new order'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="cart-page cart-page-empty">
        <div className="container">
          <div className="cart-page-header">
            <h1 className="cart-page-title">{t.yourCart}</h1>
            <span className="cart-page-count">
              {(t as { cartItemsEmptyLabel?: string }).cartItemsEmptyLabel ?? 'Empty'}
            </span>
          </div>

          <OrderLookupSection lang={lang} emptyCart />

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

  const contactFormContent = (idPrefix: string) => {
    const tc = t as Record<string, string>;
    const senderPhoneHint = getNationalPhoneHint(countryCode, phoneNational);
    const recipientPhoneHint = getNationalPhoneHint(recipientCountryCode, recipientPhoneNational);
    const senderHintText = tc[senderPhoneHint.messageKey] ?? senderPhoneHint.messageKey;
    const recipientHintText = tc[recipientPhoneHint.messageKey] ?? recipientPhoneHint.messageKey;

    return (
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
      <div className="cart-phone-and-contact-wrap">
        <div className="cart-contact-field cart-phone-field-group">
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
              {renderCountryCodeOptions(lang)}
            </select>
            <input
              id={`${idPrefix}cart-phone`}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phoneNational}
              onChange={handlePhoneInput}
              onBlur={() =>
                setPhoneNational((p) => normalizeNationalPhoneOnBlur(p, countryCode))
              }
              placeholder={t.phoneNumberPlaceholder}
              className="cart-contact-input cart-phone-input"
              autoComplete="tel-national"
              maxLength={PHONE_MAX_DIGITS}
              aria-describedby={
                phoneNational.length > 0 && senderPhoneHint.tone !== 'success'
                  ? `${idPrefix}cart-phone-hint`
                  : undefined
              }
              aria-invalid={phoneNational.length > 0 && senderPhoneHint.tone === 'warn'}
            />
          </div>
          {phoneNational.length > 0 && senderPhoneHint.tone !== 'success' && (
            <p
              id={`${idPrefix}cart-phone-hint`}
              className={`cart-phone-hint cart-phone-hint--${senderPhoneHint.tone}`}
              role={senderPhoneHint.tone === 'warn' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {senderHintText}
            </p>
          )}
        </div>
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
                : t.contactWhatsApp;
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
          <div className="cart-contact-field cart-phone-field-group">
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
                {renderCountryCodeOptions(lang)}
              </select>
              <input
                id={`${idPrefix}cart-recipient-phone`}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={recipientPhoneNational}
                onChange={handleRecipientPhoneInput}
                onBlur={() =>
                  setRecipientPhoneNational((p) =>
                    normalizeNationalPhoneOnBlur(p, recipientCountryCode)
                  )
                }
                placeholder={t.recipientPhonePlaceholder}
                className="cart-contact-input cart-phone-input"
                autoComplete="tel-national"
                maxLength={PHONE_MAX_DIGITS}
                aria-describedby={
                  recipientPhoneNational.length > 0 && recipientPhoneHint.tone !== 'success'
                    ? `${idPrefix}cart-recipient-phone-hint`
                    : undefined
                }
                aria-invalid={
                  recipientPhoneNational.length > 0 && recipientPhoneHint.tone === 'warn'
                }
              />
            </div>
            {recipientPhoneNational.length > 0 && recipientPhoneHint.tone !== 'success' && (
              <p
                id={`${idPrefix}cart-recipient-phone-hint`}
                className={`cart-phone-hint cart-phone-hint--${recipientPhoneHint.tone}`}
                role={recipientPhoneHint.tone === 'warn' ? 'alert' : 'status'}
                aria-live="polite"
              >
                {recipientHintText}
              </p>
            )}
          </div>
          <label className="cart-contact-checkbox-label cart-ordering-for-else">
            <input
              type="checkbox"
              checked={surpriseDelivery}
              onChange={(e) => setSurpriseDelivery(e.target.checked)}
              className="cart-contact-checkbox"
            />
            <span className="cart-ordering-for-else-text">
              {(t as { surpriseDeliveryCheckbox?: string }).surpriseDeliveryCheckbox ??
                'Surprise delivery (do not contact the recipient in advance about the delivery)'}
            </span>
          </label>
        </>
      )}
    </div>
    );
  };

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
              <div className="cart-accordion-body-wrapper" aria-hidden={mobileOpenSection !== 'bag'}>
                <div className="cart-accordion-body cart-accordion-body-bag" onClick={(e) => e.stopPropagation()}>
                  <div className="cart-list cart-mobile-list">
                    {items.map((item, index) => {
                      const name = lang === 'th' ? item.nameTh : item.nameEn;
                      const addOnsSummary = buildAddOnsSummaryForDisplay(item, t);
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
                              {isNonBouquetCartLine(item)
                                ? `${((item.size.label || '').trim() || '—')} — ฿${(item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {})).toLocaleString()}`
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
                    <h3 className="cart-order-summary-title">
                      {t.orderComposition ?? 'Order composition'}
                    </h3>
                    {items.map((item, i) => {
                      const name = lang === 'th' ? item.nameTh : item.nameEn;
                      const qty = item.quantity ?? 1;
                      const addOnsTotal = getAddOnsTotal(item.addOns?.productAddOns ?? {});
                      const unitPrice = item.size.price + addOnsTotal;
                      const lineTotal = unitPrice * qty;
                      const itemLabel = isNonBouquetCartLine(item)
                        ? name
                        : qty > 1
                          ? `${name} — ${item.size.label} × ${qty}`
                          : `${name} — ${item.size.label}`;
                      const addOnLines = buildAddOnsSummaryLines(item, t);
                      return (
                        <div key={`mob-sum-${item.bouquetId}-${i}`}>
                          <div className="cart-order-summary-row cart-order-summary-item">
                            <span>{itemLabel}</span>
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
              </div>
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
              <div className="cart-accordion-body-wrapper" aria-hidden={mobileOpenSection !== 'delivery'}>
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
              </div>
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
              <div className="cart-accordion-body-wrapper" aria-hidden={mobileOpenSection !== 'contact'}>
                <div className="cart-accordion-body cart-accordion-body-contact" onClick={(e) => e.stopPropagation()}>
                  {contactFormContent('mobile-')}
                  <button
                    type="button"
                    className="cart-accordion-save-btn"
                    disabled={
                      !isContactValid(
                        customerName,
                        countryCode,
                        phoneNational,
                        contactPreference,
                        customerEmail,
                        isOrderingForSomeoneElse,
                        recipientName,
                        recipientCountryCode,
                        recipientPhoneNational,
                        t as Record<string, string | number>
                      )
                    }
                    onClick={handleMobileContactSave}
                  >
                    {lang === 'th' ? 'บันทึกและดำเนินการต่อ' : 'Save & Continue'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {(() => {
            const paymentAvailabilityBase = getPaymentAvailability({
              hasDeliveryDistrict: !!delivery.deliveryDistrict,
              isFormValid: isPaymentUnlocked,
              isLoading: placing,
              firstIncompleteHint: getFirstIncompleteHint(),
              messages: {
                selectDeliveryArea: lang === 'th' ? 'กรุณาเลือกพื้นที่จัดส่งเพื่อดูตัวเลือกชำระเงิน' : 'Select a delivery area to see payment options',
                processing: lang === 'th' ? 'กำลังดำเนินการ...' : 'Processing...',
              },
            });
            const preparingCheckout =
              lang === 'th' ? 'กำลังเตรียมการชำระเงิน…' : 'Preparing checkout…';
            const paymentAvailability =
              checkoutSubmissionToken || items.length === 0
                ? paymentAvailabilityBase
                : {
                    stripe: { enabled: false, reason: preparingCheckout },
                  };
            const incompleteHint = !paymentAvailability.stripe.enabled
              ? paymentAvailability.stripe.reason
              : undefined;
            const handleDeliveryDateTimeChange = (date: string, timeSlot: string) => {
              setDelivery((prev) => ({ ...prev, date, timeSlot }));
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
            onPlaceOrder={handlePlaceOrder}
            onDeliveryDateTimeChange={handleDeliveryDateTimeChange}
            formatDate={formatStickyDate}
            labels={{
              dateLabel: t.dateLabel ?? 'Date',
              deliveryFeeLabel: t.deliveryFeeLabel,
              totalLabel: t.totalLabel,
              placeOrder: t.payWithStripe,
              orderLabel: (t as { orderLabel?: string }).orderLabel ?? (lang === 'th' ? 'ชำระเงิน' : 'Pay'),
              redirecting: lang === 'th' ? 'กำลังเตรียมชำระเงิน...' : 'Redirecting...',
              creating: lang === 'th' ? 'กำลังเปิดหน้าชำระเงิน...' : 'Opening secure checkout...',
              unavailableRightNow: lang === 'th' ? 'ไม่พร้อมใช้งานในขณะนี้' : 'Unavailable right now',
              change: lang === 'th' ? 'เปลี่ยน' : 'Change',
              delivery: lang === 'th' ? 'จัดส่ง' : 'Delivery',
              showCheckout: lang === 'th' ? 'แสดงชำระเงิน' : 'Show checkout',
              specifyDeliveryDate: tBuyNow.specifyDeliveryDate,
              todayLabel: tBuyNow.todayLabel,
              tomorrowLabel: tBuyNow.tomorrowLabel,
              selectTimeSlot: tBuyNow.selectTimeSlot,
              preferredTime: (tBuyNow as { preferredTime?: string }).preferredTime,
              save: lang === 'th' ? 'บันทึก' : 'Save',
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
            title={t.payWithStripe}
            showLocationPicker
            step3Heading={t.contactInfoStepHeading}
            step3Content={
              <div className="cart-place-order">
                {contactFormContent('')}
                <div className="cart-place-order-actions">
                <div className="cart-place-order-pc-stack">
                <div className="cart-place-order-buttons">
                  <span className="cart-place-order-pc-tooltip-wrap">
                    <button
                      type="button"
                      className={`cart-place-order-btn cart-place-order-bank-btn ${isPaymentUnlocked ? 'cart-place-order-ready' : ''}`}
                      onClick={handlePlaceOrder}
                      disabled={placing || !isPaymentUnlocked}
                      aria-busy={placing}
                    >
                      <svg
                        className="cart-place-order-btn__icon"
                        width={18}
                        height={18}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.25}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 01-8 0" />
                      </svg>
                      {placing ? (lang === 'th' ? 'กำลังเปิดหน้าชำระเงิน...' : 'Opening secure checkout...') : t.payWithStripe}
                    </button>
                  </span>
                </div>
                <div
                  className={`cart-place-order-hint-slot ${desktopHintAnimOpen ? 'cart-place-order-hint-slot--visible' : ''}`}
                  onTransitionEnd={handleDesktopCheckoutHintTransitionEnd}
                >
                  {desktopHintDisplay && (
                    <div className="cart-place-order-hint-inner">
                      <span className="cart-place-order-hint-icon" aria-hidden>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="13" />
                          <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
                        </svg>
                      </span>
                      <p
                        className={`cart-place-order-hint ${desktopHintDisplay.isError ? 'cart-place-order-hint--error' : ''}`}
                        role={desktopHintDisplay.isError ? 'alert' : undefined}
                        aria-live="polite"
                      >
                        {desktopHintDisplay.text}
                      </p>
                    </div>
                  )}
                </div>
                </div>
                </div>
              </div>
            }
          />
        </section>
        </div>
        <div className="cart-desktop-column-right">
        <aside className="cart-sticky-sidebar">
        <h2 className="cart-sticky-sidebar-title">Order Summary</h2>
        <div className="cart-items-and-summary">
        <div className="cart-list">
          {items.map((item, index) => {
            const name = lang === 'th' ? item.nameTh : item.nameEn;
            const addOnsSummary = buildAddOnsSummaryForDisplay(item, t);
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
                    {isNonBouquetCartLine(item)
                      ? `${((item.size.label || '').trim() || '—')} — ฿${(item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {})).toLocaleString()}`
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
                <h3 className="cart-order-summary-title">
                  {t.orderComposition ?? 'Order composition'}
                </h3>
                {items.map((item, i) => {
                  const name = lang === 'th' ? item.nameTh : item.nameEn;
                  const qty = item.quantity ?? 1;
                  const addOnsTotal = getAddOnsTotal(item.addOns?.productAddOns ?? {});
                  const unitPrice = item.size.price + addOnsTotal;
                  const lineTotal = unitPrice * qty;
                  const priceStr = lineTotal.toLocaleString();
                  const sizePart = isNonBouquetCartLine(item)
                    ? ((item.size.label || '').trim() || '—')
                    : item.size.label;
                  const itemLine = itemLineFmt
                    .replace('{name}', name)
                    .replace('{size}', sizePart)
                    .replace('{qty}', String(qty))
                    .replace('{lineTotal}', priceStr)
                    .replace('{price}', priceStr);
                  const addOnLines = buildAddOnsSummaryLines(item, t);
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
      {mapsLinkPromptOpen && (
        <div
          className="cart-maps-prompt-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-maps-prompt-title"
        >
          <button
            type="button"
            className="cart-maps-prompt-backdrop"
            aria-label={lang === 'th' ? 'ปิด' : 'Close'}
            onClick={() => {
              setMapsLinkPromptOpen(false);
              setShouldFocusMapsLinkOnReturn(false);
            }}
          />
          <div className="cart-maps-prompt-card">
            <h2 id="cart-maps-prompt-title" className="cart-maps-prompt-title">
              {lang === 'th' ? 'วิธีเพิ่มหมุด Google Maps' : 'How to add Google map pin'}
            </h2>
            <p className="cart-maps-prompt-text">
              {lang === 'th'
                ? 'หมุดบนแผนที่ช่วยให้คนขับหาจุดส่งได้เร็วขึ้น การเพิ่มให้จะช่วยเราได้มาก'
                : 'Pin on the map helps our drivers find exact spot faster. Adding one would help us very much.'}
            </p>
            <ul className="cart-maps-prompt-steps" aria-label={lang === 'th' ? 'วิธีเพิ่มลิงก์' : 'How to add the link'}>
              <li>{lang === 'th' ? 'เปิด Google Maps แล้ววางหมุด/เลือกสถานที่' : 'Open Google Maps and drop a pin / choose the place'}</li>
              <li>{lang === 'th' ? 'กด “แชร์” (Share)' : 'Tap “Share”'}</li>
              <li>{lang === 'th' ? 'กด “คัดลอกลิงก์” (Copy link)' : 'Tap “Copy link”'}</li>
              <li>{lang === 'th' ? 'กลับมาวางลิงก์ลงในช่อง “Google Maps link”' : 'Come back and paste into the “Google Maps link” field'}</li>
            </ul>
            <div className="cart-maps-prompt-actions">
              <button type="button" className="cart-maps-prompt-btn cart-maps-prompt-btn-primary" onClick={handleMapsPromptAddPin}>
                <PinIcon className="cart-maps-prompt-btn-icon" size={18} />
                {lang === 'th' ? 'เปิด Google Maps เพื่อวางหมุด' : 'Open Google Maps & add pin'}
              </button>
              <button
                type="button"
                className="cart-maps-prompt-btn cart-maps-prompt-btn-secondary"
                onClick={() => void handleMapsPromptContinueWithoutLink()}
              >
                {lang === 'th' ? 'ดำเนินการต่อโดยไม่มีลิงก์' : 'Continue without link'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .cart-maps-prompt-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .cart-maps-prompt-backdrop {
          position: absolute;
          inset: 0;
          border: none;
          margin: 0;
          padding: 0;
          background: rgba(0, 0, 0, 0.45);
          cursor: pointer;
        }
        .cart-maps-prompt-card {
          position: relative;
          z-index: 1;
          max-width: 400px;
          width: 100%;
          padding: 22px 20px 20px;
          background: var(--surface);
          border-radius: var(--radius);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
          border: 1px solid var(--border);
        }
        .cart-maps-prompt-title {
          font-family: var(--font-serif);
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 12px;
          line-height: 1.3;
        }
        .cart-maps-prompt-text {
          font-size: 0.92rem;
          line-height: 1.55;
          color: var(--text-muted);
          margin: 0 0 18px;
        }
        .cart-maps-prompt-steps {
          margin: -8px 0 18px;
          padding-left: 1.15em;
          color: var(--text);
          font-size: 0.9rem;
          line-height: 1.5;
          list-style: disc;
          list-style-position: outside;
        }
        .cart-maps-prompt-steps li {
          margin: 6px 0;
        }
        .cart-maps-prompt-steps li::marker {
          color: var(--text-muted);
        }
        .cart-maps-prompt-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cart-maps-prompt-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 16px;
          font-size: 0.95rem;
          font-weight: 600;
          font-family: inherit;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .cart-maps-prompt-btn-icon {
          flex-shrink: 0;
        }
        .cart-maps-prompt-btn-primary {
          background: var(--accent);
          color: #fff;
          border: none;
        }
        .cart-maps-prompt-btn-primary:hover {
          filter: brightness(0.95);
        }
        .cart-maps-prompt-btn-secondary {
          background: transparent;
          color: var(--text);
          border: 1px solid var(--border);
        }
        .cart-maps-prompt-btn-secondary:hover {
          background: var(--pastel-cream);
        }
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
          position: sticky;
          top: 78px;
          width: 388px;
          max-width: 100%;
          align-self: start;
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
        .cart-sticky-sidebar-title {
          margin: 0 0 14px;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--foreground);
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
          display: block;
          margin: -2px 0 8px;
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: var(--pastel-cream, #fdf8f3);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text);
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
          background: #fff;
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
        .cart-place-order-pc-stack {
          display: flex;
          flex-direction: column;
          gap: 0;
          width: 100%;
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
        .cart-place-order-hint-slot {
          max-height: 0;
          margin-top: 0;
          opacity: 0;
          overflow: hidden;
          flex-shrink: 0;
          transform: translateZ(0);
          transition:
            max-height 0.58s cubic-bezier(0.22, 1, 0.36, 1),
            margin-top 0.58s cubic-bezier(0.22, 1, 0.36, 1),
            opacity 0.58s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cart-place-order-hint-slot--visible {
          max-height: 56px;
          margin-top: 6px;
          opacity: 1;
        }
        .cart-place-order-hint-inner {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 2px 0 0;
          min-height: 22px;
        }
        .cart-place-order-hint-icon {
          flex-shrink: 0;
          color: #b91c1c;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 0.5px;
        }
        .cart-place-order-hint {
          flex: 1;
          min-width: 0;
          margin: 0;
          padding: 0;
          font-size: 10px;
          font-weight: 500;
          color: #b91c1c;
          line-height: 1.35;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
        .cart-place-order-hint--error {
          font-weight: 600;
        }
        @media (prefers-reduced-motion: reduce) {
          .cart-place-order-hint-slot {
            transition-duration: 0.01ms;
          }
        }
        .cart-contact-info {
          margin-bottom: 16px;
          padding-top: 0;
        }
        .cart-contact-info > .cart-contact-field:first-child {
          margin-top: 0;
        }
        .cart-contact-field {
          margin-bottom: 10px;
        }
        .cart-phone-and-contact-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
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
        .cart-phone-field-group {
          position: relative;
        }
        .cart-phone-hint {
          font-size: 0.625rem;
          font-weight: 500;
          margin: 3px 0 0;
          line-height: 1.35;
          max-width: 100%;
          transition: color 0.12s ease;
        }
        .cart-phone-hint--neutral {
          color: #94a3b8;
          font-weight: 400;
        }
        .cart-phone-hint--tip {
          color: #b45309;
        }
        .cart-phone-hint--warn {
          color: #b91c1c;
        }
        .cart-phone-hint--success {
          color: #15803d;
        }
        .cart-contact-preferences {
          margin: 0;
          padding: 0;
          border: none;
        }
        .cart-contact-legend {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 6px;
          display: block;
        }
        .cart-contact-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .cart-contact-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: var(--pastel-cream);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
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
          width: 14px;
          height: 14px;
          border: 1px solid var(--border);
          border-radius: 3px;
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
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            display: grid;
            grid-template-rows: auto 0fr;
            transition: grid-template-rows 0.44s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          }
          .cart-accordion-section.cart-accordion-open {
            grid-template-rows: auto 1fr;
          }
          .cart-accordion-body-wrapper {
            overflow: hidden;
            min-height: 0;
            contain: layout style;
          }
          .cart-accordion-body-wrapper .cart-accordion-body {
            padding-top: 2px;
          }
          .cart-accordion-header {
            display: flex;
            align-items: center;
            min-height: 52px;
            padding: 16px 20px;
            cursor: pointer;
            user-select: none;
            flex-shrink: 0;
          }
          .cart-accordion-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text);
            flex: 1;
            min-width: 0;
            line-height: 1.35;
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
            transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
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
            font-size: 0.7rem;
            margin: 0;
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
            padding: 12px 16px 16px;
            background: #fff;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
          }
          .cart-delivery .cart-contact-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 20px;
            margin-bottom: 16px;
          }
          .cart-delivery .cart-contact-info .cart-section-label {
            grid-column: 1 / -1;
            margin: 0 0 2px;
          }
          .cart-delivery .cart-contact-info .cart-section-label:first-child {
            margin-top: 0;
          }
          .cart-delivery .cart-contact-info .cart-contact-field {
            margin-bottom: 0;
          }
          .cart-delivery .cart-contact-info .cart-phone-and-contact-wrap {
            grid-column: 1;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
            max-width: 100%;
          }
          .cart-delivery .cart-contact-info .cart-phone-and-contact-wrap .cart-contact-field {
            margin-bottom: 0;
          }
          .cart-delivery .cart-contact-info .cart-phone-and-contact-wrap .cart-contact-preferences {
            margin: 0;
          }
          .cart-delivery .cart-contact-info .cart-ordering-for-else {
            grid-column: 1 / -1;
            margin-top: 2px;
          }
          .cart-delivery .cart-contact-info .cart-ordering-for-else .cart-ordering-for-else-text {
            margin-left: 5px;
          }
          .cart-delivery .cart-place-order-actions {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: flex-end;
            justify-content: flex-end;
            gap: 12px;
          }
          .cart-delivery .cart-place-order-pc-stack {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            width: auto;
            max-width: 100%;
          }
          .cart-delivery .cart-place-order-buttons {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 0;
            width: auto;
            justify-content: flex-end;
          }
          /* Native title tooltip on hover: disabled buttons do not receive pointer events */
          .cart-delivery .cart-place-order-pc-tooltip-wrap {
            display: inline-flex;
            max-width: 100%;
            vertical-align: middle;
          }
          .cart-delivery .cart-place-order-pc-tooltip-wrap:has(.cart-place-order-bank-btn:disabled) {
            cursor: not-allowed;
          }
          .cart-delivery .cart-place-order-pc-tooltip-wrap .cart-place-order-bank-btn:disabled {
            pointer-events: none;
          }
          .cart-delivery .cart-place-order-btn {
            width: auto;
            min-width: 160px;
            max-width: 220px;
          }
          .cart-delivery .cart-place-order-hint-slot {
            flex: 0 1 auto;
            width: auto;
            max-width: min(280px, 100%);
            align-self: flex-end;
          }
          .cart-delivery .cart-contact-label {
            display: block;
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 3px;
          }
          .cart-delivery .cart-contact-input {
            width: 100%;
            padding: 8px 10px;
            font-size: 0.9rem;
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
            padding: 8px 10px;
            font-size: 0.85rem;
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
            min-width: 6rem;
            max-width: 10rem;
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
            font-size: 0.65rem;
            margin: 0;
          }
          .cart-delivery .cart-section-label {
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--text);
            margin: 16px 0 8px;
          }
          .cart-delivery .cart-contact-preferences {
            margin: 0;
            padding: 0;
            border: none;
          }
          .cart-delivery .cart-contact-legend {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 4px;
          }
          .cart-delivery .cart-contact-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .cart-delivery .cart-contact-chip {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 8px;
            background: var(--pastel-cream);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
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
            width: 12px;
            height: 12px;
            border: 1px solid var(--border);
            border-radius: 3px;
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
            font-size: 9px;
            font-weight: 700;
            color: #fff;
            line-height: 1;
          }
          .cart-delivery .cart-required {
            color: #b91c1c;
          }

          /* Desktop: Place Order — muted until form valid, then primary CTA */
          .cart-delivery .cart-place-order-bank-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition:
              background-color 0.22s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.22s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.22s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.22s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .cart-delivery .cart-place-order-btn__icon {
            flex-shrink: 0;
          }
          .cart-delivery .cart-place-order-bank-btn[aria-busy='true'] .cart-place-order-btn__icon {
            display: none;
          }
          .cart-delivery .cart-place-order-bank-btn:not(.cart-place-order-ready) {
            background: #e8ebe6;
            border: 1px solid #d4d9d2;
            color: #5c635f;
            box-shadow: none;
            cursor: not-allowed;
            opacity: 1;
            filter: none;
          }
          .cart-delivery .cart-place-order-bank-btn:not(.cart-place-order-ready):hover {
            background: #e2e6e0;
            border-color: #cdd3ca;
            color: #525a56;
            transform: none;
          }
          .cart-delivery .cart-place-order-bank-btn.cart-place-order-ready:not(:disabled) {
            background: var(--primary);
            border: 1px solid color-mix(in srgb, var(--primary) 90%, #0a0f0e);
            color: #f7f8f6;
            box-shadow: 0 4px 14px rgba(26, 60, 52, 0.22);
            cursor: pointer;
          }
          .cart-delivery .cart-place-order-bank-btn.cart-place-order-ready:not(:disabled):hover {
            background: #153029;
            border-color: #153029;
            color: #fafaf8;
            box-shadow: 0 6px 18px rgba(26, 60, 52, 0.28);
            transform: translateY(-1px);
          }
          .cart-delivery .cart-place-order-bank-btn.cart-place-order-ready:not(:disabled):active {
            transform: translateY(0);
            box-shadow: 0 2px 10px rgba(26, 60, 52, 0.2);
          }
          .cart-delivery .cart-place-order-bank-btn.cart-place-order-ready:disabled {
            cursor: wait;
            opacity: 0.92;
          }
          .cart-delivery .cart-place-order-bank-btn.cart-place-order-ready:focus-visible:not(:disabled) {
            outline: 2px solid var(--primary);
            outline-offset: 3px;
          }
        }
        @media (min-width: 1201px) and (prefers-reduced-motion: reduce) {
          .cart-delivery .cart-place-order-bank-btn {
            transition: none;
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
            margin: 12px 0 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          .cart-mobile-contact-fields .cart-contact-legend {
            font-size: 0.75rem !important;
            font-weight: 600 !important;
            color: var(--text-muted) !important;
            margin-bottom: 4px !important;
            margin-bottom: 10px !important;
            display: block !important;
          }
          .cart-mobile-contact-fields .cart-contact-chips {
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 4px !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .cart-mobile-contact-fields .cart-contact-chip {
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            padding: 4px 6px !important;
            font-size: 0.7rem !important;
            background: var(--pastel-cream) !important;
            border: 1px solid var(--border) !important;
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
            width: 12px !important;
            height: 12px !important;
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
            font-size: 9px !important;
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
