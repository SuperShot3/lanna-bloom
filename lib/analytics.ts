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
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'messenger_click', eventParams);
    return;
  }
  // GA loads afterInteractive; if gtag not ready yet, retry so the click is not lost
  if (typeof window !== 'undefined') {
    let attempts = 0;
    const retry = () => {
      if (attempts++ >= 15) return; // give up after ~1.5s
      if (window.gtag) {
        window.gtag('event', 'messenger_click', eventParams);
        return;
      }
      setTimeout(retry, 100);
    };
    setTimeout(retry, 100);
  }
}

/**
 * Send a messenger_click event to GA4 so header and success-page messenger link clicks appear in reports.
 */
export function trackMessengerClick(params: {
  channel: MessengerChannel;
  page_location: MessengerPageLocation;
  link_url?: string;
}): void {
  if (typeof window === 'undefined') return;
  sendMessengerClickEvent(params);
}
