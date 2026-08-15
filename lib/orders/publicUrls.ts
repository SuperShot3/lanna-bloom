import { getBaseUrl } from '@/lib/siteUrl';

export { getBaseUrl };

export function getOrderDetailsUrl(orderId: string, options?: { token?: string | null }): string {
  const base = `${getBaseUrl()}/order/${encodeURIComponent(orderId)}`;
  const token = options?.token?.trim();
  if (!token) return base;
  const qs = new URLSearchParams({ token }).toString();
  return `${base}?${qs}`;
}

/** Opens Stripe Checkout for an admin pay-link (`/pay/{id}?token=`). Draft ids until paid; then order ids. */
export function getPayLinkUrl(
  orderId: string,
  options?: { token?: string | null; cancelled?: boolean }
): string {
  const base = `${getBaseUrl()}/pay/${encodeURIComponent(orderId)}`;
  const params = new URLSearchParams();
  const token = options?.token?.trim();
  if (token) params.set('token', token);
  if (options?.cancelled) params.set('cancelled', '1');
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Stripe success_url — `{CHECKOUT_SESSION_ID}` must stay unencoded so Stripe can substitute it. */
export function getPayLinkStripeSuccessUrl(linkId: string, token: string): string {
  const base = getPayLinkUrl(linkId, { token });
  const join = base.includes('?') ? '&' : '?';
  return `${base}${join}session_id={CHECKOUT_SESSION_ID}`;
}
