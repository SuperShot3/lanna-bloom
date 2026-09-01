/**
 * Site-level structured data for the locale homepages.
 *
 * OnlineStore is the site entity (no walk-in shop). Do not add a street
 * address, Florist/LocalBusiness block, or review markup.
 */
import { getBaseUrl } from '@/lib/siteUrl';
import { BRAND_LOGO_SRC } from '@/lib/brandLogo';
import { getActiveMarkets } from '@/lib/delivery/markets';
import { getContactPhoneE164 } from '@/lib/messenger';
import { GOOGLE_PLACE_URL } from '@/lib/reviewsConfig';

export const OFFICIAL_BUSINESS_NAME = 'Lanna Bloom Flower Delivery';
export const BUSINESS_ALTERNATE_NAME = 'Lanna Bloom';

const SOCIAL_LINKS = [
  'https://www.facebook.com/profile.php?id=61587782069439',
  'https://www.instagram.com/lannabloomchiangmai/',
  'https://www.youtube.com/@Lannabloom',
  'https://www.tiktok.com/@lannabloom_th',
  GOOGLE_PLACE_URL,
];

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

function organizationId(base: string): string {
  return `${base}/#organization`;
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  const base = getBaseUrl();
  const telephone = getContactPhoneE164();
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': organizationId(base),
    name: OFFICIAL_BUSINESS_NAME,
    alternateName: BUSINESS_ALTERNATE_NAME,
    url: `${base}/en`,
    logo: `${base}${BRAND_LOGO_SRC}`,
    image: `${base}${BRAND_LOGO_SRC}`,
    telephone,
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [...WEEKDAYS],
      opens: '08:00',
      closes: '20:00',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone,
      contactType: 'customer service',
      availableLanguage: ['English', 'Thai'],
    },
    sameAs: SOCIAL_LINKS,
    areaServed: [
      { '@type': 'City', name: 'Chiang Mai' },
      ...getActiveMarkets().map((m) => ({
        '@type': 'City',
        name: m.customerFacingNameEn,
      })),
    ],
  };
}

export function buildWebSiteJsonLd(): Record<string, unknown> {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    name: BUSINESS_ALTERNATE_NAME,
    url: `${base}/en`,
    inLanguage: ['en', 'th'],
    publisher: { '@id': organizationId(base) },
  };
}

export function buildFaqPageJsonLd(
  faq: readonly { q: string; a: string }[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
