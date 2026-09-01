import { isMarketPathSlug } from '@/lib/delivery/markets';

export const DELIVERY_DESTINATION_PROMPT_STORAGE_KEY =
  'lanna-bloom-delivery-destination-prompt';

function pathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

/** True when this storefront path already implies a delivery city or is a checkout flow. */
export function shouldSkipDeliveryDestinationPromptPath(
  pathname: string,
  lang: string
): boolean {
  const parts = pathSegments(pathname);
  const rest = parts[0] === lang ? parts.slice(1) : parts;
  const first = rest[0];
  const second = rest[1];

  if (
    first === 'cart' ||
    first === 'checkout' ||
    first === 'track-order' ||
    first === 'partner'
  ) {
    return true;
  }

  if (first && isMarketPathSlug(first)) return true;
  if (first === 'catalog' && second && isMarketPathSlug(second)) return true;
  return false;
}

export function shouldShowDeliveryDestinationPrompt(input: {
  pathname: string;
  lang: string;
  dismissed: boolean;
  cookieAccepted: boolean;
}): boolean {
  if (input.dismissed) return false;
  if (!input.cookieAccepted) return false;
  if (shouldSkipDeliveryDestinationPromptPath(input.pathname, input.lang)) return false;
  return true;
}

export function readDeliveryDestinationPromptDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DELIVERY_DESTINATION_PROMPT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissDeliveryDestinationPrompt(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DELIVERY_DESTINATION_PROMPT_STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}
