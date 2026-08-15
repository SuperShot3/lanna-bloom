import { getBaseUrl } from '@/lib/siteUrl';

export { getBaseUrl };

export function getOrderDetailsUrl(orderId: string, options?: { token?: string | null }): string {
  const base = `${getBaseUrl()}/order/${encodeURIComponent(orderId)}`;
  const token = options?.token?.trim();
  if (!token) return base;
  const qs = new URLSearchParams({ token }).toString();
  return `${base}?${qs}`;
}

/** Customer review + pay page for admin-created amount/description charges. */
export function getPayLinkUrl(orderId: string, options?: { token?: string | null }): string {
  const base = `${getBaseUrl()}/pay/${encodeURIComponent(orderId)}`;
  const token = options?.token?.trim();
  if (!token) return base;
  const qs = new URLSearchParams({ token }).toString();
  return `${base}?${qs}`;
}
