import { getBaseUrl, getOrderDetailsUrl, type Order } from '@/lib/orders';
import {
  getDefaultSocialLinks,
  getEmailBrandHeaderHtml,
  getEmailBrandLogoUrl,
  getSocialFooterHtml,
} from './socialFooter';
import { buildOrderLineProductShowcase } from './productShowcaseBlock';

const BAHT = (n: number) => `฿${n.toLocaleString()}`;

function importantDatesUrl(order: Order, base: string): string {
  const email = (order.customerEmail ?? '').trim();
  const name = (order.customerName ?? '').trim();
  const u = new URL('/important-dates', base);
  if (email) u.searchParams.set('email', email);
  if (name) u.searchParams.set('name', name);
  u.searchParams.set('order', order.orderId);
  return u.toString();
}

/**
 * Fills all known template variables for order-related emails, including
 * pre-rendered `social_footer`.
 */
export function buildOrderTemplateVariables(
  order: Order,
  options?: { orderDetailsPath?: string; baseOverride?: string }
): Record<string, string> {
  const base = (options?.baseOverride ?? getBaseUrl()).replace(/\/$/, '');
  const detailsUrl = getOrderDetailsUrl(order.orderId);
  const links = getDefaultSocialLinks();
  const brandHeader = getEmailBrandHeaderHtml(links);
  const logoUrl = getEmailBrandLogoUrl();
  const items = order.items ?? [];
  const first = items[0];
  const productName =
    items.length > 0
      ? items.map((i) => i.bouquetTitle).filter(Boolean).join(', ')
      : '—';
  const productImage = first?.imageUrl?.trim() || '';

  return {
    customer_name: (order.customerName ?? '').trim() || 'there',
    customer_email: (order.customerEmail ?? '').trim(),
    order_id: order.orderId,
    order_number: order.orderId,
    product_name: productName,
    product_image: productImage,
    delivery_date: (order.delivery?.preferredTimeSlot ?? '').trim() || '—',
    delivery_address: (order.delivery?.address ?? '').trim() || '—',
    total_price: BAHT(order.pricing?.grandTotal ?? 0),
    review_link: links.reviewUrl,
    important_dates_link: importantDatesUrl(order, base),
    website_url: links.websiteUrl,
    instagram_url: links.instagramUrl,
    facebook_url: links.facebookUrl,
    tiktok_url: links.tiktokUrl,
    google_maps_url: links.googleMapsUrl,
    /* Placeholders for reminder templates; empty for order context */
    recipient_name: '',
    relationship: '',
    occasion_type: '',
    days_left: '',
    recommended_product_name: '',
    recommended_product_image: '',
    recommended_product_price: '',
    confirm_url: detailsUrl,
    choose_another_url: `${base}/en/catalog`,
    unsubscribe_url: '',
    brand_header: brandHeader,
    logo_url: logoUrl,
    product_showcase: buildOrderLineProductShowcase(base, first),
    social_footer: getSocialFooterHtml(links),
  };
}
