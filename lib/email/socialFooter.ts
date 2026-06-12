import { getBaseUrl } from '@/lib/orders';
import {
  DEFAULT_FACEBOOK_URL,
  DEFAULT_GOOGLE_MAPS_URL,
  DEFAULT_INSTAGRAM_URL,
  DEFAULT_REVIEW_URL,
  DEFAULT_WEBSITE_URL,
} from './constants';
import { escapeHtml } from './escape';

/**
 * Public path for email logo. Prefer a real PNG in `public/`; `logo_icon_64` is not always committed,
 * so we default to the PWA touch icon (always in repo; works in admin iframe preview + Resend).
 * Override with `EMAIL_BRAND_LOGO_PATH` (path only) or `EMAIL_BRAND_LOGO_URL` (full URL).
 */
export function getEmailBrandLogoPath(): string {
  return process.env.EMAIL_BRAND_LOGO_PATH?.trim() || '/favicon_io/apple-touch-icon.png';
}

/**
 * Absolute URL for the logo image in emails. Override with `EMAIL_BRAND_LOGO_URL` (e.g. CDN).
 */
export function getEmailBrandLogoUrl(): string {
  const override = process.env.EMAIL_BRAND_LOGO_URL?.trim();
  if (override) return override;
  const base = getBaseUrl().replace(/\/$/, '');
  const path = getEmailBrandLogoPath().replace(/^\//, '');
  return `${base}/${path}`;
}

/**
 * Centered logo block (linked to your site). Use as `{{brand_header}}` at the top of HTML bodies.
 */
export function getEmailBrandHeaderHtml(links: SocialLinks = getDefaultSocialLinks()): string {
  const home = escapeHtml(links.websiteUrl);
  const src = escapeHtml(getEmailBrandLogoUrl());
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
  <tr>
    <td align="center" style="padding: 0 0 4px 0;">
      <a href="${home}" style="text-decoration: none; border: 0; display: inline-block;" title="Lanna Bloom">
        <img src="${src}" width="56" height="56" style="display: block; margin: 0 auto; border: 0; max-width: 64px; height: auto; vertical-align: middle; outline: none;" alt="Lanna Bloom" />
      </a>
    </td>
  </tr>
</table>`.trim();
}

/**
 * If the template in the database was created before `{{brand_header}}` existed, the rendered HTML
 * has no logo. Admin preview (and test send) can patch that by inserting the same block.
 */
export function ensureBrandHeaderInHtml(
  renderedHtml: string,
  originalTemplate: string,
  brandHeaderHtml: string
): string {
  if (originalTemplate.includes('{{brand_header}}')) {
    return renderedHtml;
  }
  const block = brandHeaderHtml.trim();
  if (!block) return renderedHtml;
  const m = renderedHtml.match(/<body[^>]*>/i);
  if (m && m.index !== undefined) {
    return (
      renderedHtml.slice(0, m.index + m[0].length) +
      `\n${block}\n` +
      renderedHtml.slice(m.index + m[0].length)
    );
  }
  return `${block}\n${renderedHtml}`;
}

/**
 * Default footer icons (PNG, 32px source displayed at 24px).
 * You can self-host and set EMAIL_FOOTER_ICON_*_URL to your domain, or
 * set EMAIL_FOOTER_TEXT_ONLY=1 to use text links instead of images.
 */
const DEFAULT_FOOTER_ICONS = {
  /**
   * Earth globe (clearer than “internet”); Twemoji PNG on cdnjs — reliable in email clients.
   * @see https://cdnjs.com/libraries/twemoji
   */
  website: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.0/72x72/1f30d.png',
  instagram: 'https://img.icons8.com/fluency/32/instagram-new.png',
  facebook: 'https://img.icons8.com/fluency/32/facebook-new.png',
  tiktok: 'https://img.icons8.com/fluency/32/tiktok.png',
  maps: 'https://img.icons8.com/fluency/32/marker--v1.png',
  /**
   * Google “G” — matches the Google review URL; 32px asset from gstatic.
   * Override with EMAIL_FOOTER_ICON_REVIEW_URL if you prefer a star or other mark.
   */
  review: 'https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_32dp.png',
} as const;

export type SocialLinks = {
  websiteUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  /** Optional; if empty, TikTok is omitted. */
  tiktokUrl: string;
  googleMapsUrl: string;
  reviewUrl: string;
};

function envOrEmpty(key: string): string {
  return process.env[key]?.trim() ?? '';
}

/**
 * Resolves public URLs. TikTok: TIKTOK_URL or NEXT_PUBLIC_TIKTOK_URL, else empty.
 */
export function getDefaultSocialLinks(): SocialLinks {
  return {
    websiteUrl: envOrEmpty('WEBSITE_URL') || DEFAULT_WEBSITE_URL,
    instagramUrl: envOrEmpty('INSTAGRAM_URL') || DEFAULT_INSTAGRAM_URL,
    facebookUrl: envOrEmpty('FACEBOOK_URL') || DEFAULT_FACEBOOK_URL,
    tiktokUrl: envOrEmpty('TIKTOK_URL') || envOrEmpty('NEXT_PUBLIC_TIKTOK_URL') || '',
    googleMapsUrl: envOrEmpty('GOOGLE_MAPS_URL') || DEFAULT_GOOGLE_MAPS_URL,
    reviewUrl: envOrEmpty('REVIEW_URL') || DEFAULT_REVIEW_URL,
  };
}

/**
 * Table-based, email-client-safe social footer. Defaults to 24px icons (see DEFAULT_FOOTER_ICONS);
 * override with EMAIL_FOOTER_ICON_*_URL or use EMAIL_FOOTER_TEXT_ONLY=1 for text links only.
 */
export function getSocialFooterHtml(links: SocialLinks = getDefaultSocialLinks()): string {
  const w = escapeHtml(links.websiteUrl);
  const ig = escapeHtml(links.instagramUrl);
  const fb = escapeHtml(links.facebookUrl);
  const tt = links.tiktokUrl.trim() ? escapeHtml(links.tiktokUrl) : '';
  const maps = escapeHtml(links.googleMapsUrl);
  const review = escapeHtml(links.reviewUrl);

  const textOnly =
    process.env.EMAIL_FOOTER_TEXT_ONLY === '1' || process.env.EMAIL_FOOTER_TEXT_ONLY === 'true';

  const websiteIcon = process.env.EMAIL_FOOTER_ICON_WEBSITE_URL?.trim() || (textOnly ? undefined : DEFAULT_FOOTER_ICONS.website);
  const instaIcon = process.env.EMAIL_FOOTER_ICON_INSTAGRAM_URL?.trim() || (textOnly ? undefined : DEFAULT_FOOTER_ICONS.instagram);
  const facebookIcon = process.env.EMAIL_FOOTER_ICON_FACEBOOK_URL?.trim() || (textOnly ? undefined : DEFAULT_FOOTER_ICONS.facebook);
  const mapsIcon = process.env.EMAIL_FOOTER_ICON_MAPS_URL?.trim() || (textOnly ? undefined : DEFAULT_FOOTER_ICONS.maps);
  const reviewIcon = process.env.EMAIL_FOOTER_ICON_REVIEW_URL?.trim() || (textOnly ? undefined : DEFAULT_FOOTER_ICONS.review);
  const tiktokIcon =
    process.env.EMAIL_FOOTER_ICON_TIKTOK_URL?.trim() || (textOnly ? undefined : DEFAULT_FOOTER_ICONS.tiktok);

  const linkWithOptionalIcon = (href: string, label: string, iconUrl: string | undefined) => {
    if (iconUrl) {
      return `<a href="${href}" style="text-decoration: none; color: #5c4a32; display: inline-block; margin: 0 6px; vertical-align: middle;" title="${escapeHtml(
        label
      )}"><img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(label)}" width="24" height="24" style="display: block; border: 0; vertical-align: middle; outline: none;" /></a>`;
    }
    return `<a href="${href}" style="color: #967a4d; font-weight: 600; text-decoration: none; font-size: 14px; margin: 0 8px; display: inline-block;">${escapeHtml(
      label
    )}</a>`;
  };

  const parts: string[] = [
    linkWithOptionalIcon(w, 'Website', websiteIcon),
    linkWithOptionalIcon(ig, 'Instagram', instaIcon),
    linkWithOptionalIcon(fb, 'Facebook', facebookIcon),
  ];
  if (tt) {
    parts.push(linkWithOptionalIcon(tt, 'TikTok', tiktokIcon));
  }
  parts.push(
    linkWithOptionalIcon(maps, 'Google Maps', mapsIcon),
    linkWithOptionalIcon(review, 'Review us', reviewIcon)
  );

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e8e0d4; margin-top: 20px; padding-top: 16px;">
  <tr>
    <td align="center" style="font-size: 12px; color: #666; line-height: 1.5;">
      <p style="margin: 0 0 10px 0; font-size: 13px; color: #2c2415; font-weight: 600;">Lanna Bloom</p>
      <div style="text-align: center; line-height: 32px;">${parts.join('')}</div>
    </td>
  </tr>
</table>`.trim();
}
