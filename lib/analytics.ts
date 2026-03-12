/**
 * Analytics helpers for GTM-owned Google Analytics 4 tracking.
 * The app only pushes structured events to dataLayer; GTM owns transport and pageviews.
 * All events fire only on client; dedupe and purchase persistence applied.
 */

import {
  pushToDataLayer,
  trackPurchase as pushPurchaseToDataLayer,
} from './analytics/gtag';

const CURRENCY = 'THB';

/** GA4 ecommerce item schema: item_id, item_name, item_category, item_variant, price, quantity, currency */
export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  index?: number;
  item_category?: string;
  item_variant?: string;
  currency?: string;
}

export type MessengerChannel = 'line' | 'whatsapp' | 'telegram';

export type MessengerPageLocation =
  | 'header'
  | 'checkout_success'
  | 'order_page'
  | 'product'
  | 'cart'
  | 'guide';

/** In-memory dedupe: prevent duplicate events from re-renders (e.g. view_item_list, view_cart). */
const sentEvents = new Set<string>();

function eventKey(name: string, suffix?: string): string {
  return suffix ? `${name}:${suffix}` : name;
}

function wasSent(key: string): boolean {
  return sentEvents.has(key);
}

function markSent(key: string): void {
  sentEvents.add(key);
}

function sendEvent(eventName: string, eventParams: Record<string, unknown>): void {
  pushToDataLayer(eventName, eventParams);
}

function ensureItems(items: AnalyticsItem[]): AnalyticsItem[] {
  return items.map((it, i) => ({
    ...it,
    quantity: it.quantity ?? 1,
    index: it.index ?? i,
    currency: it.currency ?? CURRENCY,
  }));
}

// --- Ecommerce (GA4 recommended events) ---

/**
 * Fire view_item when user views a product detail page (GA4 ecommerce).
 * Deduped per item_id per session to avoid double fire from React re-renders.
 */
export function trackViewItem(params: {
  currency?: string;
  value?: number;
  items: AnalyticsItem[];
}): void {
  if (typeof window === 'undefined') return;
  const { currency = CURRENCY, value, items } = params;
  if (!items.length) return;
  const key = eventKey('view_item', items[0].item_id);
  if (wasSent(key)) return;
  markSent(key);
  const eventParams: Record<string, unknown> = {
    currency,
    items: ensureItems(items),
  };
  if (value != null) eventParams.value = value;
  sendEvent('view_item', eventParams);
}

/**
 * Fire view_item_list when catalog (or list) is viewed (GA4 ecommerce).
 * Deduped per listName per session.
 */
export function trackViewItemList(listName: string, items: AnalyticsItem[]): void {
  if (typeof window === 'undefined') return;
  const key = eventKey('view_item_list', listName);
  if (wasSent(key)) return;
  markSent(key);
  sendEvent('view_item_list', {
    item_list_id: listName,
    item_list_name: listName,
    items: ensureItems(items),
    currency: CURRENCY,
  });
}

/**
 * Fire select_item when user clicks a product from a list (e.g. catalog card).
 */
export function trackSelectItem(listName: string, item: AnalyticsItem): void {
  if (typeof window === 'undefined') return;
  const items = ensureItems([{ ...item, index: 0 }]);
  sendEvent('select_item', {
    item_list_id: listName,
    item_list_name: listName,
    items,
    currency: CURRENCY,
  });
}

/**
 * Fire add_to_cart when user adds a product to cart (GA4 ecommerce).
 */
export function trackAddToCart(params: {
  currency?: string;
  value?: number;
  items: AnalyticsItem[];
}): void {
  if (typeof window === 'undefined') return;
  const { currency = CURRENCY, value, items } = params;
  const eventParams: Record<string, unknown> = {
    currency,
    items: ensureItems(items),
  };
  if (value != null) eventParams.value = value;
  sendEvent('add_to_cart', eventParams);
}

/**
 * Fire remove_from_cart when user removes an item from cart.
 */
export function trackRemoveFromCart(params: {
  currency?: string;
  value?: number;
  items: AnalyticsItem[];
}): void {
  if (typeof window === 'undefined') return;
  const { currency = CURRENCY, value, items } = params;
  const eventParams: Record<string, unknown> = {
    currency,
    items: ensureItems(items),
  };
  if (value != null) eventParams.value = value;
  sendEvent('remove_from_cart', eventParams);
}

/**
 * Fire view_cart when user views the cart page. Deduped once per session.
 */
export function trackViewCart(items: AnalyticsItem[], value?: number): void {
  if (typeof window === 'undefined') return;
  const key = 'view_cart';
  if (wasSent(key)) return;
  markSent(key);
  const eventParams: Record<string, unknown> = {
    currency: CURRENCY,
    items: ensureItems(items),
  };
  if (value != null) eventParams.value = value;
  sendEvent('view_cart', eventParams);
}

/**
 * Fire begin_checkout when user explicitly starts the order/payment flow (GA4 ecommerce).
 * Deduped per session (survives React Strict Mode double-mount).
 */
export function trackBeginCheckout(params: {
  currency?: string;
  value?: number;
  items: AnalyticsItem[];
}): void {
  if (typeof window === 'undefined') return;
  const key = 'begin_checkout';
  if (wasSent(key)) return;
  markSent(key);
  const { currency = CURRENCY, value, items } = params;
  const eventParams: Record<string, unknown> = {
    currency,
    items: ensureItems(items),
  };
  if (value != null) eventParams.value = value;
  sendEvent('begin_checkout', eventParams);
}

/**
 * Fire add_shipping_info when user provides shipping/delivery info (GA4 ecommerce).
 * Deduped per session (survives React Strict Mode double-mount).
 */
export function trackAddShippingInfo(params: {
  shippingTier: string;
  currency?: string;
  value?: number;
  items: AnalyticsItem[];
}): void {
  if (typeof window === 'undefined') return;
  const key = 'add_shipping_info';
  if (wasSent(key)) return;
  markSent(key);
  const { shippingTier, currency = CURRENCY, value, items } = params;
  const eventParams: Record<string, unknown> = {
    currency,
    shipping_tier: shippingTier,
    items: ensureItems(items),
  };
  if (value != null) eventParams.value = value;
  sendEvent('add_shipping_info', eventParams);
}

/**
 * Fire add_payment_info when user adds payment info (GA4 ecommerce).
 * Call when user selects payment method and proceeds (e.g. clicks "Pay with Stripe").
 */
export function trackAddPaymentInfo(params: {
  paymentType: string;
  currency?: string;
  value?: number;
  items: AnalyticsItem[];
}): void {
  if (typeof window === 'undefined') return;
  const { paymentType, currency = CURRENCY, value, items } = params;
  const eventParams: Record<string, unknown> = {
    payment_type: paymentType,
    currency,
    items: ensureItems(items),
  };
  if (value != null) eventParams.value = value;
  sendEvent('add_payment_info', eventParams);
}

/**
 * Push purchase to dataLayer only. GTM is the only sender to GA4.
 * Dedupe is applied in gtag (localStorage/sessionStorage per orderId).
 */
export function trackPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  items: AnalyticsItem[];
  transactionId?: string;
}): void {
  pushPurchaseToDataLayer({
    orderId: params.orderId,
    value: params.value,
    currency: params.currency ?? CURRENCY,
    items: params.items,
    transactionId: params.transactionId,
  });
}

const GENERATE_LEAD_DEDUPE_PREFIX = 'lanna-bloom_sent_generate_lead_';

/** REMOVED: ads_conversion_Success_Page_1 – causes duplicate conversions in Google Ads.
 * Use GA4 purchase event only. Import purchase as conversion in Google Ads. */

/**
 * Fire generate_lead when order is created via Place Order (bank transfer / PromptPay).
 * Use purchase later if payment becomes confirmed.
 * Deduped by orderId via localStorage.
 */
export function trackGenerateLead(params: {
  orderId: string;
  value: number;
  currency?: string;
  items: AnalyticsItem[];
}): void {
  if (typeof window === 'undefined') return;
  const { orderId, value, currency = CURRENCY, items } = params;
  const storageKey = `${GENERATE_LEAD_DEDUPE_PREFIX}${orderId}`;
  try {
    if (window.localStorage.getItem(storageKey) === '1') return;
    window.localStorage.setItem(storageKey, '1');
  } catch {
    // ignore
  }
  sendEvent('generate_lead', {
    order_id: orderId,
    value,
    currency,
    items: ensureItems(items),
  });
}

// --- Non-ecommerce UI events ---

/**
 * contact_click: LINE / WhatsApp / Telegram buttons.
 * Params: channel, page_path, bouquet_id (optional).
 */
export function trackContactClick(params: {
  channel: MessengerChannel;
  page_path?: string;
  bouquet_id?: string;
}): void {
  if (typeof window === 'undefined') return;
  const eventParams: Record<string, unknown> = {
    channel: params.channel,
    page_path: params.page_path ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
  };
  if (params.bouquet_id != null) eventParams.bouquet_id = params.bouquet_id;
  sendEvent('contact_click', eventParams);
}

/**
 * CTA click events (home page and similar). Fires once per click; no dedupe.
 * Use for: cta_home_top, cta_home_bottom_view_all, cta_home_sticky_browse, cta_home_back_to_top
 */
export function trackCtaClick(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  sendEvent(eventName, { page_path: window.location.pathname, ...params });
}

/**
 * language_change: when user switches language.
 */
export function trackLanguageChange(lang: string): void {
  if (typeof window === 'undefined') return;
  sendEvent('language_change', { language: lang, page_path: window.location.pathname });
}

// --- Legacy / alias for existing callers ---

/**
 * Legacy messenger click event for existing reports.
 * Also sends contact_click as the canonical cross-channel contact event.
 */
export function trackMessengerClick(params: {
  channel: MessengerChannel;
  page_location: MessengerPageLocation;
  link_url?: string;
}): void {
  if (typeof window === 'undefined') return;
  const { channel, page_location, link_url } = params;
  const page_path = typeof window !== 'undefined' ? window.location.pathname : '';
  sendEvent('messenger_click', {
    channel,
    page_location,
    page_path,
    ...(link_url != null && { link_url }),
  });
  trackContactClick({ channel, page_path });
}
