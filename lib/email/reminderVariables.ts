import { getBaseUrl } from '@/lib/orders';
import {
  getDefaultSocialLinks,
  getEmailBrandHeaderHtml,
  getEmailBrandLogoUrl,
  getSocialFooterHtml,
} from './socialFooter';
import type { RecommendedBouquet } from './recommendBouquet';
import { buildReminderProductShowcase } from './productShowcaseBlock';

export type ReminderRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  recipient_name: string;
  relationship: string | null;
  occasion_type: string;
  occasion_day: number;
  occasion_month: number;
  occasion_year: number | null;
  unsubscribe_token: string;
};

function formatSnake(s: string): string {
  if (!s) return '';
  return s
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function relationshipFragment(rel: string | null | undefined): string {
  if (!rel?.trim()) return '';
  const label = formatSnake(rel);
  return ` (${label})`;
}

export function buildReminderTemplateVariables(
  r: ReminderRow,
  daysLeft: number,
  stage: '7_days' | '3_days' | '1_day',
  product: RecommendedBouquet
): Record<string, string> {
  const base = getBaseUrl().replace(/\/$/, '');
  const token = r.unsubscribe_token;
  const links = getDefaultSocialLinks();
  const brandHeader = getEmailBrandHeaderHtml(links);
  const logoUrl = getEmailBrandLogoUrl();
  return {
    customer_name: (r.customer_name || '').trim() || 'there',
    customer_email: (r.customer_email || '').trim(),
    recipient_name: (r.recipient_name || '').trim() || 'your recipient',
    relationship: relationshipFragment(r.relationship),
    occasion_type: formatSnake(r.occasion_type) || r.occasion_type,
    days_left: String(daysLeft),
    recommended_product_name: product.name,
    recommended_product_image: product.image,
    recommended_product_price: product.priceLabel,
    confirm_url: product.confirmUrl,
    choose_another_url: product.chooseAnotherUrl,
    unsubscribe_url: `${base}/reminders/unsubscribe?token=${encodeURIComponent(token)}`,
    order_id: '',
    order_number: '',
    product_name: '',
    product_image: '',
    delivery_date: '',
    delivery_address: '',
    total_price: '',
    review_link: links.reviewUrl,
    important_dates_link: `${base}/important-dates?email=${encodeURIComponent(r.customer_email)}`,
    website_url: links.websiteUrl,
    instagram_url: links.instagramUrl,
    facebook_url: links.facebookUrl,
    tiktok_url: links.tiktokUrl,
    google_maps_url: links.googleMapsUrl,
    brand_header: brandHeader,
    logo_url: logoUrl,
    product_showcase: buildReminderProductShowcase(base, product),
    social_footer: getSocialFooterHtml(links),
  };
}

export function templateKeyForStage(stage: '7_days' | '3_days' | '1_day'): 'reminder_7_days' | 'reminder_3_days' | 'reminder_1_day' {
  if (stage === '3_days') return 'reminder_3_days';
  if (stage === '1_day') return 'reminder_1_day';
  return 'reminder_7_days';
}

export function stagesAllowedForPreference(pref: string): Array<'7_days' | '3_days' | '1_day'> {
  switch (pref) {
    case '7_days_only':
      return ['7_days'];
    case '3_days_only':
      return ['3_days'];
    case 'all':
      return ['7_days', '3_days', '1_day'];
    case '7_and_3_days':
    default:
      return ['7_days', '3_days'];
  }
}

export function dayCountMatchesStage(
  daysLeft: number
): '7_days' | '3_days' | '1_day' | null {
  if (daysLeft === 7) return '7_days';
  if (daysLeft === 3) return '3_days';
  if (daysLeft === 1) return '1_day';
  return null;
}
