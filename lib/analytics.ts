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
  | 'cart';

/**
 * Send a messenger_click event to GA4 so header and success-page messenger link clicks appear in reports.
 */
export function trackMessengerClick(params: {
  channel: MessengerChannel;
  page_location: MessengerPageLocation;
  link_url?: string;
}): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'messenger_click', {
    channel: params.channel,
    page_location: params.page_location,
    ...(params.link_url != null && { link_url: params.link_url }),
  });
}
