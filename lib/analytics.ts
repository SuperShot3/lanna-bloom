/**
 * Analytics helpers for Google Analytics 4 (gtag or GTM dataLayer).
 * When NEXT_PUBLIC_USE_GTM=true, events are pushed to dataLayer (no gtag); otherwise gtag is used.
 * All events fire only on client; dedupe and purchase persistence applied.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

const USE_GTM = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USE_GTM === 'true';

const CURRENCY = 'THB';
const PURCHASE_DEDUPE_PREFIX = 'lanna-bloom_sent_purchase_';
const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

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

function sendGtagEvent(eventName: string, eventParams: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  if (USE_GTM) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...eventParams });
    if (isDev) console.debug('[GA4 via GTM]', eventName, eventParams);
    return;
  }

  const doSend = () => {
    if (window.gtag) {
      window.gtag('event', eventName, eventParams);
      if (isDev) console.debug('[GA4]', eventName, eventParams);
      return true;
    }
    return false;
  };
  if (doSend()) return;
  let attempts = 0;
  const retry = () => {
    if (attempts++ >= 15) return;
    if (doSend()) return;
    setTimeout(retry, 100);
  };
  setTimeout(retry, 100);
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
  sendGtagEvent('view_item', eventParams);
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
  sendGtagEvent('view_item_list', {
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
  sendGtagEvent('select_item', {
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
  sendGtagEvent('add_to_cart', eventParams);
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
  sendGtagEvent('remove_from_cart', eventParams);
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
  sendGtagEvent('view_cart', eventParams);
}

/**
 * Fire begin_checkout when user lands on cart/checkout with items (GA4 ecommerce).
 * Call site should use a ref to fire only once per cart view.
 */
export function trackBeginCheckout(params: {
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
  sendGtagEvent('begin_checkout', eventParams);
}

/**
 * Fire add_shipping_info when user provides shipping/delivery info (GA4 ecommerce).
 */
export function trackAddShippingInfo(params: {
  shippingTier: string;
  currency?: string;
  value?: number;
  items: AnalyticsItem[];
}): void {
  if (typeof window === 'undefined') return;
  const { shippingTier, currency = CURRENCY, value, items } = params;
  const eventParams: Record<string, unknown> = {
    currency,
    shipping_tier: shippingTier,
    items: ensureItems(items),
  };
  if (value != null) eventParams.value = value;
  sendGtagEvent('add_shipping_info', eventParams);
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
  sendGtagEvent('add_payment_info', eventParams);
}

/**
 * Fire purchase once per order (GA4 ecommerce). Deduped by orderId via localStorage.
 * ONLY for confirmed Stripe payment success (real payment).
 */
export function trackPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  items: AnalyticsItem[];
  transactionId?: string;
}): void {
  if (typeof window === 'undefined') return;
  const { orderId, value, currency = CURRENCY, items } = params;
  const storageKey = `${PURCHASE_DEDUPE_PREFIX}${orderId}`;
  try {
    if (window.localStorage.getItem(storageKey) === '1') return;
    window.localStorage.setItem(storageKey, '1');
  } catch {
    // ignore
  }
  sendGtagEvent('purchase', {
    transaction_id: params.transactionId ?? orderId,
    value,
    currency,
    items: ensureItems(items),
  });
}

const GENERATE_LEAD_DEDUPE_PREFIX = 'lanna-bloom_sent_generate_lead_';

/**
 * Fire generate_lead when order is created via Place Order (bank transfer / PromptPay).
 * NOT for Stripe – use purchase for confirmed Stripe payment.
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
  sendGtagEvent('generate_lead', {
    order_id: orderId,
    value,
    currency,
    items: ensureItems(items),
  });
}

// --- Non-ecommerce UI events ---

/**
 * contact_click: LINE / WhatsApp / Telegram buttons (for Google Ads optimization).
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
  sendGtagEvent('contact_click', eventParams);
}

/**
 * CTA click events (home page and similar). Fires once per click; no dedupe.
 * Use for: cta_home_top, cta_home_bottom_view_all, cta_home_sticky_browse, cta_home_back_to_top
 */
export function trackCtaClick(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  sendGtagEvent(eventName, { page_path: window.location.pathname, ...params });
}

/**
 * language_change: when user switches language.
 */
export function trackLanguageChange(lang: string): void {
  if (typeof window === 'undefined') return;
  sendGtagEvent('language_change', { language: lang, page_path: window.location.pathname });
}

// --- Legacy / alias for existing callers ---

/**
 * Messenger click (header, success page, product, cart, guide).
 * Also sends contact_click for consistency and channel-specific events (click_line, etc.).
 */
export function trackMessengerClick(params: {
  channel: MessengerChannel;
  page_location: MessengerPageLocation;
  link_url?: string;
}): void {
  if (typeof window === 'undefined') return;
  const { channel, page_location, link_url } = params;
  const page_path = typeof window !== 'undefined' ? window.location.pathname : '';
  sendGtagEvent('messenger_click', {
    channel,
    page_location,
    page_path,
    ...(link_url != null && { link_url }),
  });
  sendGtagEvent(
    channel === 'line' ? 'click_line' : channel === 'whatsapp' ? 'click_whatsapp' : 'click_telegram',
    { channel, page_location, page_path, ...(link_url != null && { link_url }) }
  );
  trackContactClick({ channel, page_path });
}
