/**
 * Site-level structured data for the locale homepages.
 *
 * Intentionally Organization + WebSite only — the business has no walk-in
 * physical location, so no Florist/LocalBusiness schema and no street address.
 */
import { getBaseUrl } from '@/lib/orders';
import { MARKETS } from '@/lib/delivery/markets';

const SOCIAL_LINKS = [
  'https://www.facebook.com/profile.php?id=61587782069439',
  'https://www.instagram.com/lannabloomchiangmai/',
];

const CONTACT_PHONE = '+66-80-331-3431';

function organizationId(base: string): string {
  return `${base}/#organization`;
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(base),
    name: 'Lanna Bloom',
    url: `${base}/`,
    logo: `${base}/favicon_io/apple-touch-icon.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: CONTACT_PHONE,
      contactType: 'customer service',
      availableLanguage: ['English', 'Thai'],
    },
    sameAs: SOCIAL_LINKS,
    areaServed: [
      { '@type': 'City', name: 'Chiang Mai' },
      ...MARKETS.map((m) => ({ '@type': 'City', name: m.customerFacingNameEn })),
    ],
  };
}

export function buildWebSiteJsonLd(): Record<string, unknown> {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    name: 'Lanna Bloom',
    url: `${base}/`,
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
