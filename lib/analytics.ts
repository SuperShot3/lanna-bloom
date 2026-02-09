/**
 * Analytics helpers for Google Analytics / gtag.
 * Requires gtag to be loaded (e.g. via GoogleAnalytics component).
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type MessengerChannel = 'line' | 'whatsapp' | 'telegram';

export type MessengerPageLocation =
  | 'header'
  | 'checkout_success'
  | 'product'
  | 'cart'
  | 'guide';

const CURRENCY = 'THB';

/** GA4 ecommerce item shape (item_id, item_name, price, quantity, etc.). */
export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  index?: number;
  item_category?: string;
}

function sendGtagEvent(eventName: string, eventParams: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
    return;
  }
  if (typeof window !== 'undefined') {
    let attempts = 0;
    const retry = () => {
      if (attempts++ >= 15) return;
      if (window.gtag) {
        window.gtag('event', eventName, eventParams);
        return;
      }
      setTimeout(retry, 100);
    };
    setTimeout(retry, 100);
  }
}

function sendMessengerClickEvent(params: {
  channel: MessengerChannel;
  page_location: MessengerPageLocation;
  link_url?: string;
}): void {
  const eventParams = {
    channel: params.channel,
    page_location: params.page_location,
    ...(params.link_url != null && { link_url: params.link_url }),
  };
  sendGtagEvent('messenger_click', eventParams);
  // Also send channel-specific events for easier reporting: click_line, click_whatsapp, click_telegram
  const channelEvent =
    params.channel === 'line'
      ? 'click_line'
      : params.channel === 'whatsapp'
        ? 'click_whatsapp'
        : 'click_telegram';
  sendGtagEvent(channelEvent, eventParams);
}

/**
 * Send a messenger_click event to GA4 so header and success-page messenger link clicks appear in reports.
 * Also sends click_line, click_whatsapp, or click_telegram for channel-specific reporting.
 */
export function trackMessengerClick(params: {
  channel: MessengerChannel;
  page_location: MessengerPageLocation;
  link_url?: string;
}): void {
  if (typeof window === 'undefined') return;
  sendMessengerClickEvent(params);
}

/**
 * Fire view_item when user views a product detail page (GA4 ecommerce).
 */
export function trackViewItem(params: {
  currency?: string;
  value?: number;
  items: AnalyticsItem[];
}): void {
  if (typeof window === 'undefined') return;
  const { currency = CURRENCY, value, items } = params;
  const eventParams: Record<string, unknown> = {
    currency,
    items,
  };
  if (value != null) eventParams.value = value;
  sendGtagEvent('view_item', eventParams);
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
    items,
  };
  if (value != null) eventParams.value = value;
  sendGtagEvent('add_to_cart', eventParams);
}

/**
 * Fire begin_checkout when user lands on cart/checkout with items (GA4 ecommerce).
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
    items,
  };
  if (value != null) eventParams.value = value;
  sendGtagEvent('begin_checkout', eventParams);
}
