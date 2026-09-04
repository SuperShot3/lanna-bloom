import type { Metadata } from 'next';
import { getOrderDetailsUrl } from '@/lib/orders/publicUrls';
import {
  absoluteSiteUrl,
  shareImagesFromPath,
  websiteOpenGraph,
  websiteTwitter,
} from '@/lib/seo/shareMetadata';

export const ORDER_OG_IMAGE_PATH = '/og/order.jpg';
export const ORDER_OG_IMAGE_ALT = 'Your Lanna Bloom order — this is your order page';

const GENERIC_TITLE = 'Your order | Lanna Bloom';
const GENERIC_DESCRIPTION =
  'This is your Lanna Bloom order page. Open it to view status and delivery details.';

/**
 * WhatsApp / LINE / iMessage card for `/order/{id}?token=`.
 * Generic branded copy only — never includes order number, customer name, email, or phone.
 * Always noindex. Does not look up order contents.
 */
export function buildOrderShareMetadata(opts: { orderId: string; token: string }): Metadata {
  const orderId = opts.orderId.trim();
  const token = opts.token.trim();
  const pageUrl = orderId
    ? getOrderDetailsUrl(orderId, token ? { token } : undefined)
    : absoluteSiteUrl('/order');
  const images = shareImagesFromPath(ORDER_OG_IMAGE_PATH, ORDER_OG_IMAGE_ALT);
  const robots = { index: false, follow: false } as const;

  return {
    title: GENERIC_TITLE,
    description: GENERIC_DESCRIPTION,
    robots,
    openGraph: websiteOpenGraph({
      title: GENERIC_TITLE,
      description: GENERIC_DESCRIPTION,
      url: pageUrl,
      images,
    }),
    twitter: websiteTwitter({
      title: GENERIC_TITLE,
      description: GENERIC_DESCRIPTION,
      imageUrl: images[0]?.url,
    }),
  };
}
