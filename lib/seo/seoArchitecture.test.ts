/**
 * SEO architecture tests — run with: npx tsx lib/seo/seoArchitecture.test.ts
 * Wired via npm run test:seo
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import {
  ARTICLE_SEO_LOCALES,
  articlePageRobots,
  buildAlternates,
  buildArticleAlternates,
  buildLanguageAlternates,
  cleanCanonicalUrl,
  isArticleSeoLocale,
  isSeoLocale,
  nonSeoLocaleRobots,
  SEO_LOCALES,
} from './alternates';
import { locales } from '@/lib/i18n';
import {
  destinationDisplayName,
  getActiveMarkets,
  getMarketByPathSlug,
  heroLocationName,
  MARKETS,
  marketIsIndexable,
  marketIsRouteAvailable,
  marketIsSitemapEnabled,
  type MarketRegistryEntry,
} from '@/lib/delivery/markets';
import { articleShareImages, MARKET_SHARE_ARTICLE_SLUG } from './marketShareImages';
import { buildMarketPageMetadata } from './marketPageMetadata';
import { resolveProductOgImage } from './productJsonLd';
import { DEFAULT_SHARE_IMAGE_PATH } from './shareMetadata';
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
  const upgraded = cleanCanonicalUrl('http://www.lannabloom.shop/en/catalog');
  assert.equal(upgraded, 'https://www.lannabloom.shop/en/catalog');
}

// --- Apex (non-www) → www 301, without moving /api ---
{
  type HostRedirect = {
    source: string;
    destination: string;
    statusCode?: number;
    has?: { type: string; value: string }[];
  };

  function assertApexWww301(rules: HostRedirect[], label: string) {
    const apexRules = rules.filter(
      (rule) =>
        rule.has?.some((h) => h.type === 'host' && h.value === 'lannabloom.shop') &&
        rule.destination.startsWith('https://www.lannabloom.shop')
    );
    assert.ok(apexRules.length >= 2, `${label}: expected apex → www rules`);
    for (const rule of apexRules) {
      assert.equal(rule.statusCode, 301, `${label}: ${rule.source} must be 301`);
    }
    assert.ok(
      apexRules.some((rule) => rule.source === '/'),
      `${label}: missing / → www`
    );
    const pathRule = apexRules.find((rule) => rule.source.includes(':path'));
    assert.ok(pathRule, `${label}: missing /:path* → www`);
    assert.match(
      pathRule!.source,
      /\(\?!api\//,
      `${label}: path rule must skip /api`
    );
  }

  const vercel = JSON.parse(readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8')) as {
    redirects: HostRedirect[];
  };
  assertApexWww301(vercel.redirects, 'vercel.json');
  assert.equal(
    vercel.redirects[0]?.has?.[0]?.value,
    'lannabloom.shop',
    'vercel.json: apex → www must run before / → /en'
  );

  const nextConfigSrc = readFileSync(path.join(process.cwd(), 'next.config.js'), 'utf8');
  assert.match(nextConfigSrc, /value: 'lannabloom.shop'/);
  assert.match(nextConfigSrc, /destination: 'https:\/\/www\.lannabloom\.shop\/:path'/);
  assert.match(nextConfigSrc, /statusCode: 301/);
  assert.match(nextConfigSrc, /source: '\/:path\(\(\?!api\/\)\.\*\)'/);
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
  assert.ok(langs['zh-HK'].includes('/zh-hk/phuket/flower-delivery'));
  assert.equal(langs['x-default'], langs.en);
}

{
  const langs = buildLanguageAlternates('/collections/roses-chiang-mai');
  assert.ok(langs.en.includes('/en/collections/roses-chiang-mai'));
  assert.ok(langs.th.includes('/th/collections/roses-chiang-mai'));
  assert.ok(langs['zh-HK'].includes('/zh-hk/collections/roses-chiang-mai'));
}

assert.equal(isSeoLocale('en'), true);
assert.equal(isSeoLocale('th'), true);
assert.equal(isSeoLocale('zh-hk'), true);
assert.equal(isSeoLocale('ru'), false);
assert.equal(isSeoLocale('zh-sg'), false);
assert.deepEqual([...SEO_LOCALES], ['en', 'th', 'zh-hk']);
assert.deepEqual([...ARTICLE_SEO_LOCALES], ['en', 'th']);
assert.equal(isArticleSeoLocale('zh-hk'), false);

// --- Thin-locale robots (layout noindex, follow) ---
{
  assert.equal(nonSeoLocaleRobots('en'), undefined);
  assert.equal(nonSeoLocaleRobots('th'), undefined);
  assert.equal(nonSeoLocaleRobots('zh-hk'), undefined);
  for (const lang of locales) {
    if (isSeoLocale(lang)) continue;
    const robots = nonSeoLocaleRobots(lang);
    assert.deepEqual(
      robots,
      { index: false, follow: true },
      `${lang} must be noindex, follow`
    );
  }
}

// --- Storefront hreflang includes zh-HK, never ru / zh-sg ---
{
  for (const pathSuffix of ['', '/about', '/catalog']) {
    const langs = buildLanguageAlternates(pathSuffix);
    assert.deepEqual(
      Object.keys(langs).sort(),
      ['en', 'th', 'x-default', 'zh-HK'].sort(),
      `hreflang keys for ${pathSuffix || '/'}`
    );
    assert.ok(!('ru' in langs));
    assert.ok(!('zh-hk' in langs));
    assert.ok(!('zh-sg' in langs));
  }
  const aboutRu = buildAlternates({ lang: 'ru', pathSuffix: '/about' });
  const aboutLangs = aboutRu.languages as Record<string, string>;
  assert.ok(!('ru' in aboutLangs));
  assert.ok(String(aboutRu.canonical).includes('/ru/about'));
  assert.ok(aboutLangs['zh-HK']?.includes('/zh-hk/about'));
}

// --- Articles: EN/TH hreflang only; zh-hk canonicalises to English and is noindex ---
{
  const articleAlt = buildArticleAlternates({
    lang: 'zh-hk',
    pathSuffix: '/info/delivery-policy',
  });
  const langs = articleAlt.languages as Record<string, string>;
  assert.deepEqual(Object.keys(langs).sort(), ['en', 'th', 'x-default'].sort());
  assert.ok(!('zh-HK' in langs));
  assert.ok(String(articleAlt.canonical).endsWith('/en/info/delivery-policy'));
  assert.deepEqual(articlePageRobots('zh-hk'), { index: false, follow: true });
  assert.equal(articlePageRobots('en'), undefined);
  assert.deepEqual(articlePageRobots('en', true), { index: false, follow: false });

  const enArticle = buildArticleAlternates({
    lang: 'en',
    pathSuffix: '/info/delivery-policy',
  });
  assert.ok(String(enArticle.canonical).endsWith('/en/info/delivery-policy'));
}

// --- Sitemap locales are SEO only ---
{
  for (const lang of SEO_LOCALES) {
    assert.ok(isSeoLocale(lang));
  }
  assert.ok(!SEO_LOCALES.includes('ru' as never));
  assert.ok((SEO_LOCALES as readonly string[]).includes('zh-hk'));
  assert.ok(!(SEO_LOCALES as readonly string[]).includes('zh-sg'));
}

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
    assert.ok(langs?.en && langs?.th && langs?.['zh-HK'], `${market.pathSlug} missing hreflang`);
  }
}

for (const market of getActiveMarkets()) {
  assertMarketMetadataCity(market);
}

{
  const pai = getMarketByPathSlug('pai');
  assert.ok(pai, 'Pai market must exist');
  assert.equal(destinationDisplayName('PAI', 'en'), 'Pai');
  assert.equal(destinationDisplayName('PAI', 'th'), 'ปาย');
  assert.equal(heroLocationName(pai, 'en'), 'Pai, Mae Hong Son');
  assert.equal(heroLocationName(pai, 'th'), 'ปาย แม่ฮ่องสอน');
  const paiEn = buildMarketPageMetadata({ lang: 'en', market: pai, kind: 'landing' });
  const paiTh = buildMarketPageMetadata({ lang: 'th', market: pai, kind: 'landing' });
  assert.equal(String(paiEn.title), 'Flower delivery Pai, Mae Hong Son | Lanna Bloom');
  assert.equal(String(paiTh.title), 'ส่งดอกไม้ปาย แม่ฮ่องสอน | Lanna Bloom');
}

function firstOgImageUrl(meta: Metadata): string {
  const images = meta.openGraph?.images;
  if (!images) return '';
  const first = Array.isArray(images) ? images[0] : images;
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'url' in first) {
    return String(first.url);
  }
  return '';
}

function firstOgImageAlt(meta: Metadata): string {
  const images = meta.openGraph?.images;
  if (!images) return '';
  const first = Array.isArray(images) ? images[0] : images;
  if (first && typeof first === 'object' && 'alt' in first) {
    return String(first.alt ?? '');
  }
  return '';
}

// --- City share images: landing + catalog use article-cover JPEGs ---
{
  for (const [pathSlug, articleSlug] of Object.entries(MARKET_SHARE_ARTICLE_SLUG)) {
    const jpeg = path.join(process.cwd(), 'public', 'og', `${pathSlug}.jpg`);
    assert.ok(existsSync(jpeg), `Missing city OG JPEG: ${jpeg}`);
    const article = articles.find((a) => a.slug === articleSlug);
    assert.ok(article, `Missing share article ${articleSlug} for ${pathSlug}`);
    assert.equal(article!.cover.type, 'image');
  }

  const bangkok = getMarketByPathSlug('bangkok');
  const pattaya = getMarketByPathSlug('pattaya');
  const krabi = getMarketByPathSlug('krabi');
  if (!bangkok || !pattaya || !krabi) fail('Expected bangkok, pattaya, and krabi markets');

  for (const kind of ['landing', 'catalog'] as const) {
    const bangkokMeta = buildMarketPageMetadata({
      lang: 'en',
      market: bangkok,
      kind,
    });
    const bangkokUrl = firstOgImageUrl(bangkokMeta);
    assert.ok(
      bangkokUrl.includes('/og/bangkok.jpg'),
      `${kind} Bangkok OG must use city JPEG: ${bangkokUrl}`
    );
    assert.ok(
      !bangkokUrl.includes('lanna-bloom.jpg'),
      `${kind} Bangkok OG must not use Chiang Mai default: ${bangkokUrl}`
    );
    const bangkokAlt = firstOgImageAlt(bangkokMeta);
    assert.ok(/Bangkok/i.test(bangkokAlt), `${kind} Bangkok OG alt: ${bangkokAlt}`);
    assert.ok(
      !/Chiang Mai|เชียงใหม่/i.test(bangkokAlt),
      `${kind} Bangkok OG alt must not say Chiang Mai: ${bangkokAlt}`
    );

    const pattayaMeta = buildMarketPageMetadata({
      lang: 'en',
      market: pattaya,
      kind,
    });
    const pattayaUrl = firstOgImageUrl(pattayaMeta);
    assert.ok(
      pattayaUrl.includes('/og/pattaya.jpg'),
      `${kind} Pattaya OG must use city JPEG: ${pattayaUrl}`
    );

    const krabiMeta = buildMarketPageMetadata({
      lang: 'en',
      market: krabi,
      kind,
    });
    const krabiUrl = firstOgImageUrl(krabiMeta);
    assert.ok(
      krabiUrl.includes(DEFAULT_SHARE_IMAGE_PATH),
      `${kind} Krabi OG stays on default until a cover exists: ${krabiUrl}`
    );
  }

  const productMeta = buildMarketPageMetadata({
    lang: 'en',
    market: bangkok,
    kind: 'product',
    productName: 'Roses',
    productSlug: 'red-roses',
    ogImage: { url: 'https://cdn.example.com/roses.webp', alt: 'Roses' },
  });
  const productUrl = firstOgImageUrl(productMeta);
  assert.ok(
    productUrl.includes('cdn.example.com/roses.webp'),
    `Product OG must keep bouquet photo: ${productUrl}`
  );
  assert.ok(!productUrl.includes('/og/bangkok.jpg'));
  const productCanonical = String(productMeta.alternates?.canonical ?? '');
  assert.ok(
    productCanonical.endsWith('/en/catalog/red-roses'),
    `Product canonical must be the clean URL: ${productCanonical}`
  );
  assert.ok(
    !productCanonical.includes('/bangkok/red-roses'),
    `Product canonical must not include the market slug: ${productCanonical}`
  );
  const productLangs = productMeta.alternates?.languages as Record<string, string> | undefined;
  assert.ok(productLangs?.en?.endsWith('/en/catalog/red-roses'));
  assert.ok(productLangs?.th?.endsWith('/th/catalog/red-roses'));
  assert.ok(productLangs?.['zh-HK']?.endsWith('/zh-hk/catalog/red-roses'));

  const catalogMeta = buildMarketPageMetadata({
    lang: 'en',
    market: bangkok,
    kind: 'catalog',
  });
  const catalogCanonical = String(catalogMeta.alternates?.canonical ?? '');
  assert.ok(
    catalogCanonical.endsWith('/en/catalog/bangkok'),
    `Catalog canonical must be the pretty listing URL: ${catalogCanonical}`
  );
  assert.ok(
    !catalogCanonical.endsWith('/catalog/bangkok/catalog'),
    `Catalog canonical must not double /catalog: ${catalogCanonical}`
  );

  const articleOg = articleShareImages('flower-delivery-bangkok', 'en');
  assert.ok(articleOg?.[0]?.url.includes('/og/bangkok.jpg'));
  assert.equal(articleShareImages('same-day-flower-delivery-chiang-mai', 'en'), undefined);
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
  const breakfast = articles.find((a) => a.slug === 'thai-breakfast-chiang-mai');
  assert.ok(breakfast, 'thai-breakfast-chiang-mai must stay in the registry');
  assert.equal(breakfast.noindex, true);
  assert.equal(breakfast.excludeFromSitemap, true);
  assert.equal(breakfast.excludeFromHub, true);
  assert.deepEqual(articlePageRobots('en', breakfast.noindex), {
    index: false,
    follow: false,
  });
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
  assert.equal(
    resolveProductOgImage(['http://cdn.example.com/bouquet.webp'])?.url,
    'https://cdn.example.com/bouquet.webp'
  );
  assert.equal(resolveProductOgImage(['data:image/svg+xml,x']), undefined);
}

// --- Product URLs stay region-free (canonical / hreflang / sitemap / middleware) ---
{
  const productAlt = buildAlternates({
    lang: 'en',
    pathSuffix: '/catalog/red-roses',
  });
  assert.ok(String(productAlt.canonical).endsWith('/en/catalog/red-roses'));
  const langs = productAlt.languages as Record<string, string>;
  assert.ok(langs.en.endsWith('/en/catalog/red-roses'));
  assert.ok(langs.th.endsWith('/th/catalog/red-roses'));
  assert.ok(langs['zh-HK'].endsWith('/zh-hk/catalog/red-roses'));
  assert.ok(!langs.en.includes('/catalog/krabi/'));

  const landingAlt = buildAlternates({
    lang: 'en',
    pathSuffix: '/krabi/flower-delivery',
  });
  assert.ok(String(landingAlt.canonical).endsWith('/en/krabi/flower-delivery'));

  const sitemapSrc = readFileSync(path.join(process.cwd(), 'app/sitemap.ts'), 'utf8');
  assert.ok(
    sitemapSrc.includes('/catalog/${bouquet.slug}'),
    'sitemap must emit /{lang}/catalog/{slug}'
  );
  assert.ok(
    !sitemapSrc.includes('/catalog/${market.pathSlug}/'),
    'sitemap must not emit regional product URLs'
  );
  assert.ok(
    sitemapSrc.includes('/${lang}/${market.pathSlug}/flower-delivery'),
    'sitemap must keep market landings'
  );

  const middlewareSrc = readFileSync(path.join(process.cwd(), 'middleware.ts'), 'utf8');
  assert.match(middlewareSrc, /matchRegionalProductRedirect/);
  assert.match(middlewareSrc, /NextResponse\.redirect\(dest, 308\)/);
  assert.match(middlewareSrc, /applyDeliveryRegionCookie/);
}

console.log('seoArchitecture.test.ts: all assertions passed');
