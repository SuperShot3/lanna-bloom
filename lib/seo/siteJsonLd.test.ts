/**
 * Site JSON-LD tests — run with: npm run test:seo
 */
import assert from 'node:assert/strict';
import { GOOGLE_PLACE_URL } from '@/lib/reviewsConfig';
import { BRAND_LOGO_SRC } from '@/lib/brandLogo';
import { getContactPhoneE164 } from '@/lib/messenger';
import {
  BUSINESS_ALTERNATE_NAME,
  OFFICIAL_BUSINESS_NAME,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from './siteJsonLd';

const jsonLd = buildOrganizationJsonLd();
const website = buildWebSiteJsonLd();

assert.equal(jsonLd['@type'], 'OnlineStore');
assert.equal(jsonLd.name, OFFICIAL_BUSINESS_NAME);
assert.equal(jsonLd.name, 'Lanna Bloom Flower Delivery');
assert.equal(jsonLd.alternateName, BUSINESS_ALTERNATE_NAME);
assert.equal(typeof jsonLd.url, 'string');
assert.ok(String(jsonLd.url).endsWith('/en'));
assert.ok(String(jsonLd.logo).endsWith(BRAND_LOGO_SRC));
assert.equal(jsonLd.image, jsonLd.logo);
assert.equal(jsonLd.telephone, getContactPhoneE164());
assert.equal(jsonLd.telephone, '+66803313431');
assert.ok(!('address' in jsonLd), 'service-area store must not expose a street address');
assert.ok(!('aggregateRating' in jsonLd));
assert.ok(!('review' in jsonLd));

const hours = jsonLd.openingHoursSpecification as Record<string, unknown>;
assert.equal(hours['@type'], 'OpeningHoursSpecification');
assert.equal(hours.opens, '08:00');
assert.equal(hours.closes, '20:00');
assert.deepEqual(hours.dayOfWeek, [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);

const sameAs = jsonLd.sameAs as string[];
assert.ok(sameAs.includes(GOOGLE_PLACE_URL));
assert.ok(sameAs.includes('https://www.facebook.com/profile.php?id=61587782069439'));
assert.ok(sameAs.includes('https://www.instagram.com/lannabloomchiangmai/'));
assert.ok(sameAs.includes('https://www.youtube.com/@Lannabloom'));
assert.ok(sameAs.includes('https://www.tiktok.com/@lannabloom_th'));

const areaServed = jsonLd.areaServed as { name: string }[];
const areaNames = areaServed.map((a) => a.name);
assert.ok(areaNames.includes('Chiang Mai'));
assert.ok(areaNames.includes('Bangkok'));
assert.ok(areaNames.includes('Pai'));

assert.equal(website['@type'], 'WebSite');
assert.deepEqual(website.publisher, { '@id': jsonLd['@id'] });

console.log('siteJsonLd.test.ts: all assertions passed');
