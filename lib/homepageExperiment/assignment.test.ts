/**
 * Homepage experiment assignment rules.
 * Run: npx tsx lib/homepageExperiment/assignment.test.ts
 */
import assert from 'node:assert/strict';
import {
  isKnownCrawler,
  parseHomepageVariant,
  pickWeightedVariant,
  resolveHomepageExperiment,
} from './assignment';

assert.equal(parseHomepageVariant('v1'), 'v1');
assert.equal(parseHomepageVariant('v2'), 'v2');
assert.equal(parseHomepageVariant('V1'), null);
assert.equal(parseHomepageVariant(''), null);
assert.equal(parseHomepageVariant(undefined), null);

assert.equal(isKnownCrawler('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
assert.equal(isKnownCrawler('Mozilla/5.0 (compatible; bingbot/2.0)'), true);
assert.equal(
  isKnownCrawler(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0'
  ),
  false
);
assert.equal(isKnownCrawler(undefined), false);

assert.equal(pickWeightedVariant(100, 0, 0.99), 'v1');
assert.equal(pickWeightedVariant(0, 100, 0), 'v2');
assert.equal(pickWeightedVariant(50, 50, 0.49), 'v1');
assert.equal(pickWeightedVariant(50, 50, 0.5), 'v2');
assert.equal(pickWeightedVariant(0, 0, 0.5), 'v1');

{
  const disabled = resolveHomepageExperiment({
    enabled: false,
    preview: 'v2',
    cookie: 'v2',
    isCrawler: false,
    v1Weight: 50,
    v2Weight: 50,
  });
  assert.equal(disabled.variant, 'v1');
  assert.equal(disabled.persistCookie, false);
  assert.equal(disabled.noindex, false);
}

{
  const preview = resolveHomepageExperiment({
    enabled: true,
    preview: 'v2',
    cookie: 'v1',
    isCrawler: false,
    v1Weight: 50,
    v2Weight: 50,
  });
  assert.equal(preview.variant, 'v2');
  assert.equal(preview.persistCookie, false, 'preview must not persist assignment');
  assert.equal(preview.noindex, true);
}

{
  const crawler = resolveHomepageExperiment({
    enabled: true,
    preview: null,
    cookie: 'v2',
    isCrawler: true,
    v1Weight: 0,
    v2Weight: 100,
  });
  assert.equal(crawler.variant, 'v1', 'crawlers are pinned to V1');
  assert.equal(crawler.persistCookie, false);
}

{
  const sticky = resolveHomepageExperiment({
    enabled: true,
    preview: null,
    cookie: 'v2',
    isCrawler: false,
    v1Weight: 100,
    v2Weight: 0,
  });
  assert.equal(sticky.variant, 'v2');
  assert.equal(sticky.persistCookie, true);
}

{
  const assigned = resolveHomepageExperiment({
    enabled: true,
    preview: null,
    cookie: null,
    isCrawler: false,
    v1Weight: 0,
    v2Weight: 100,
    random: 0,
  });
  assert.equal(assigned.variant, 'v2');
  assert.equal(assigned.persistCookie, true);
  assert.equal(assigned.noindex, false);
}

console.log('homepageExperiment/assignment.test.ts: ok');
