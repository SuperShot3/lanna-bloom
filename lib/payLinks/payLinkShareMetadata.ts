import type { Metadata } from 'next';
import { getPayLinkUrl } from '@/lib/orders/publicUrls';
import { formatThb } from '@/lib/currencyDisplay';
import {
  absoluteSiteUrl,
  shareImagesFromPath,
  websiteOpenGraph,
  websiteTwitter,
} from '@/lib/seo/shareMetadata';

export const PAY_LINK_OG_IMAGE_PATH = '/og/pay-link.jpg';
export const PAY_LINK_OG_IMAGE_ALT = 'Pay Lanna Bloom — secure payment request';

const GENERIC_TITLE = 'Pay Lanna Bloom';
const GENERIC_DESCRIPTION = 'Secure payment request from Lanna Bloom.';
const DESCRIPTION_MAX = 140;

export type PayLinkShareDetails = {
  amount: number;
  description: string;
};

export function truncatePayLinkOgText(text: string, maxLen: number): string {
  const s = text.trim().replace(/\s+/g, ' ');
  if (!s) return '';
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 1))}…`;
}

export function payLinkShareCopy(details: PayLinkShareDetails | null): {
  title: string;
  description: string;
} {
  if (!details || !Number.isFinite(details.amount) || details.amount <= 0) {
    return { title: GENERIC_TITLE, description: GENERIC_DESCRIPTION };
  }
  const amountLabel = formatThb(details.amount, 'en');
  const description =
    truncatePayLinkOgText(details.description, DESCRIPTION_MAX) || GENERIC_DESCRIPTION;
  return {
    title: `Pay ${amountLabel} | Lanna Bloom`,
    description,
  };
}

/**
 * WhatsApp / LINE / iMessage card for `/pay/{id}?token=`.
 * Amount + description only when the token matches an active unpaid link.
 * Never includes customer name, email, or phone. Always noindex.
 */
export function buildPayLinkShareMetadata(opts: {
  linkId: string;
  token: string;
  details: PayLinkShareDetails | null;
}): Metadata {
  const linkId = opts.linkId.trim();
  const token = opts.token.trim();
  const { title, description } = payLinkShareCopy(opts.details);
  const pageUrl = linkId
    ? getPayLinkUrl(linkId, token ? { token } : undefined)
    : absoluteSiteUrl('/pay');
  const images = shareImagesFromPath(PAY_LINK_OG_IMAGE_PATH, PAY_LINK_OG_IMAGE_ALT);
  const robots = { index: false, follow: false } as const;

  return {
    title,
    description,
    robots,
    openGraph: websiteOpenGraph({
      title,
      description,
      url: pageUrl,
      images,
    }),
    twitter: websiteTwitter({
      title,
      description,
      imageUrl: images[0]?.url,
    }),
  };
}
