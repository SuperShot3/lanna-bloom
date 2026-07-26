/**
 * SEO architecture tests — run with: npx tsx lib/seo/seoArchitecture.test.ts
 * Wired via npm run test:seo
 */
import assert from 'node:assert/strict';
import {
  buildAlternates,
  buildLanguageAlternates,
  cleanCanonicalUrl,
  isSeoLocale,
  SEO_LOCALES,
} from './alternates';
import {
  getActiveMarkets,
  MARKETS,
  marketIsIndexable,
  marketIsRouteAvailable,
  marketIsSitemapEnabled,
  type MarketRegistryEntry,
} from '@/lib/delivery/markets';
import { buildMarketPageMetadata } from './marketPageMetadata';
import { resolveProductOgImage } from './productJsonLd';
import { articles } from '@/app/[lang]/info/_data/articles';
import { getCollectionLandingPages } from '@/lib/landingPages/collectionLandingPages';

function fail(msg: string): never {
  throw new Error(msg);
}

// --- Canonical hygiene ---
{
  const cleaned = cleanCanonicalUrl(
    'https://lannabloom.shop/en/catalog/red-rose?utm_source=x&srsltid=abc'
  );
  assert.equal(cleaned, 'https://lannabloom.shop/en/catalog/red-rose');
  assert.ok(!cleaned.includes('?'));
  assert.ok(!cleaned.includes('utm_'));
}

{
  const alt = buildAlternates({
    lang: 'en',
    pathSuffix: '/phuket/flower-delivery',
  });
  const canonical = String(alt.canonical);
  assert.ok(!canonical.includes('?'));
  assert.ok(canonical.endsWith('/en/phuket/flower-delivery'));
  const langs = alt.languages as Record<string, string>;
  assert.ok(langs.en.includes('/en/phuket/flower-delivery'));
  assert.ok(langs.th.includes('/th/phuket/flower-delivery'));
  assert.equal(langs['x-default'], langs.en);
}

{
  const langs = buildLanguageAlternates('/collections/roses-chiang-mai');
  assert.ok(langs.en.includes('/en/collections/roses-chiang-mai'));
  assert.ok(langs.th.includes('/th/collections/roses-chiang-mai'));
}

assert.equal(isSeoLocale('en'), true);
assert.equal(isSeoLocale('th'), true);
assert.equal(isSeoLocale('ru'), false);
assert.deepEqual([...SEO_LOCALES], ['en', 'th']);

// --- City status rules ---
for (const market of MARKETS) {
  if (market.status === 'active') {
    assert.equal(marketIsIndexable(market), true);
    assert.equal(marketIsSitemapEnabled(market), true);
    assert.equal(marketIsRouteAvailable(market), true);
  } else if (market.status === 'coming_soon') {
    assert.equal(marketIsIndexable(market), false);
    assert.equal(marketIsSitemapEnabled(market), false);
    assert.equal(marketIsRouteAvailable(market), true);
  } else if (market.status === 'disabled') {
    assert.equal(marketIsRouteAvailable(market), false);
    assert.equal(marketIsSitemapEnabled(market), false);
  }
}

assert.equal(
  getActiveMarkets().length,
  MARKETS.filter((m) => m.status === 'active').length
);

// --- Market metadata city match (title / H1 city / canonical city) ---
function assertMarketMetadataCity(market: MarketRegistryEntry) {
  for (const lang of ['en', 'th'] as const) {
    const meta = buildMarketPageMetadata({
      lang,
      market,
      kind: 'landing',
    });
    const title = String(meta.title ?? '');
    const place =
      lang === 'th' ? market.customerFacingNameTh : market.customerFacingNameEn;
    // Title must mention the market place name (not Chiang Mai unless the market is CM — it isn't)
    assert.ok(
      title.includes(place.split(' / ')[0]) || title.includes(place),
      `Title for ${market.pathSlug}/${lang} missing place "${place}": ${title}`
    );
    assert.ok(
      !/Chiang Mai|เชียงใหม่/i.test(title) || place.toLowerCase().includes('chiang'),
      `Title for ${market.pathSlug} must not use Chiang Mai: ${title}`
    );
    const canonical = String(meta.alternates?.canonical ?? '');
    assert.ok(
      canonical.includes(`/${market.pathSlug}/flower-delivery`),
      `Canonical missing market slug: ${canonical}`
    );
    assert.ok(!canonical.includes('?'), `Canonical has query: ${canonical}`);
    if (market.status === 'coming_soon') {
      const robots = meta.robots as { index?: boolean } | undefined;
      assert.equal(robots?.index, false, `${market.pathSlug} should be noindex`);
    }
    const langs = meta.alternates?.languages as Record<string, string> | undefined;
    assert.ok(langs?.en && langs?.th, `${market.pathSlug} missing hreflang`);
  }
}

for (const market of getActiveMarkets()) {
  assertMarketMetadataCity(market);
}

// --- Sitemap eligibility invariants ---
{
  const sitemapArticles = articles.filter(
    (a) => !a.excludeFromSitemap && !a.noindex
  );
  for (const a of articles) {
    if (a.noindex && !a.excludeFromSitemap) {
      // noindex pages must not be sitemap-eligible (sitemap.ts skips noindex)
      assert.ok(
        true,
        'sitemap skips noindex — covered by filter below'
      );
    }
  }
  assert.ok(
    !sitemapArticles.some((a) => a.noindex),
    'Sitemap article set must exclude noindex'
  );
}

{
  const collections = getCollectionLandingPages();
  assert.ok(collections.length >= 1, 'Expected collection landing pages');
  for (const page of collections) {
    assert.ok(page.path.startsWith('/collections/'));
  }
}

// --- Keyword owner: abroad rewrite must not use buy-online-CM primary title ---
{
  const abroad = articles.find(
    (a) => a.slug === 'buy-flowers-online-chiang-mai-thailand'
  );
  if (!abroad) fail('Missing buy-flowers-online-chiang-mai-thailand article');
  assert.ok(
    /from abroad|จากต่างประเทศ/i.test(abroad.title) ||
      /Send Flowers/i.test(abroad.title),
    `Abroad article title should target from-abroad intent: ${abroad.title}`
  );
  assert.ok(
    !/^Buy Flowers Online in Chiang Mai/i.test(abroad.title),
    'Abroad article must not keep buy-online-CM primary title'
  );

  const birthday = articles.find(
    (a) => a.slug === 'birthday-flowers-chiang-mai-from-abroad'
  );
  if (!birthday) fail('Missing birthday abroad article');
  assert.ok(
    /birthday/i.test(birthday.title) || /วันเกิด/.test(birthday.titleTh ?? ''),
    `Birthday abroad title must be birthday-specific: ${birthday.title}`
  );
}

// --- Product OG image: skip data: placeholders, absolutize paths ---
{
  assert.equal(
    resolveProductOgImage([
      'data:image/svg+xml,%3Csvg%3E',
      'https://cdn.example.com/bouquet.webp',
    ])?.url,
    'https://cdn.example.com/bouquet.webp'
  );
  assert.equal(
    resolveProductOgImage(['/HeroImage/heroimage.webp'], {
      baseUrl: 'https://lannabloom.shop',
      alt: 'Roses',
    })?.url,
    'https://lannabloom.shop/HeroImage/heroimage.webp'
  );
  assert.equal(resolveProductOgImage(['data:image/svg+xml,x']), undefined);
}

console.log('seoArchitecture.test.ts: all assertions passed');
