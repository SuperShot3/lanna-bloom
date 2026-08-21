/**
 * First-party Google Ads attribution rules and eligibility.
 * Run: npx tsx lib/attribution/attribution.test.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ATTRIBUTION_WINDOW_MS } from './constants';
import { decodeAttrCookie, encodeAttrCookie } from './cookieCodec';
import { parseGoogleAdsConversionActionId } from './conversionAction';
import {
  offlineConversionStatusForPaidOrder,
  shouldInsertOfflineConversionRow,
} from './eligibility';
import { parseAttributionSearchParams, urlHasAttributionQuery } from './params';
import {
  classifyAttribution,
  isGoogleAdsAttributed,
  mergeAttributionSnapshot,
} from './rules';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const now = Date.parse('2026-08-21T12:00:00.000Z');

// --- Google landing → session snapshot ---
{
  const params = new URLSearchParams(
    'gclid=TeStClick1&utm_source=google&utm_medium=cpc&utm_campaign=chiang-mai-roses&campaignid=111',
  );
  assert(urlHasAttributionQuery(params), 'gclid URL is an attribution landing');
  const incoming = parseAttributionSearchParams(params);
  assert(incoming.gclid === 'TeStClick1', 'parses gclid');
  assert(incoming.utmCampaign === 'chiang-mai-roses', 'parses utm_campaign');
  assert(incoming.campaignId === '111', 'parses campaignid');
  const merged = mergeAttributionSnapshot(null, incoming, now);
  assert(isGoogleAdsAttributed(merged, now), 'Google landing is attributed');
  const cls = classifyAttribution(merged, now);
  assert(cls.source === 'google' && cls.medium === 'cpc', 'classifies google/cpc');
  const status = offlineConversionStatusForPaidOrder({
    paymentStatus: 'PAID',
    paidAt: '2026-08-21T12:05:00.000Z',
    grandTotal: 1890,
    gclid: merged.gclid,
    googleClickAt: merged.googleClickAt,
    nowMs: now,
  });
  assert(status === 'pending', 'Google landing → paid → eligible pending');
}

// --- Organic landing → paid → not eligible ---
{
  const params = new URLSearchParams('utm_source=google&utm_medium=organic');
  const incoming = parseAttributionSearchParams(params);
  const merged = mergeAttributionSnapshot(null, incoming, now);
  assert(!isGoogleAdsAttributed(merged, now), 'organic UTM is not Google Ads attributed');
  assert(classifyAttribution(merged, now).source === 'organic', 'classifies organic');
  const status = offlineConversionStatusForPaidOrder({
    paymentStatus: 'PAID',
    paidAt: '2026-08-21T12:05:00.000Z',
    grandTotal: 1890,
    gclid: merged.gclid,
    gbraid: merged.gbraid,
    wbraid: merged.wbraid,
    nowMs: now,
  });
  assert(status === 'not_applicable', 'organic paid order is not uploaded');
}

// --- Referrer google.com without click id is organic, not Ads ---
{
  const snap = mergeAttributionSnapshot(null, { referrer: 'https://www.google.com/' }, now);
  assert(!isGoogleAdsAttributed(snap, now), 'google referrer alone is not Ads');
  assert(classifyAttribution(snap, now).source === 'organic', 'referrer google → organic');
}

// --- Unpaid → not eligible ---
{
  const status = offlineConversionStatusForPaidOrder({
    paymentStatus: 'NOT_PAID',
    paidAt: null,
    grandTotal: 1890,
    gclid: 'click',
    nowMs: now,
  });
  assert(status === 'not_applicable', 'unpaid is not eligible');
}

// --- grand_total 0 → not eligible ---
{
  const status = offlineConversionStatusForPaidOrder({
    paymentStatus: 'PAID',
    paidAt: '2026-08-21T12:05:00.000Z',
    grandTotal: 0,
    gclid: 'click',
    nowMs: now,
  });
  assert(status === 'not_applicable', 'zero-value paid order is not uploaded');
}

// --- Double enqueue → one conversion row ---
{
  assert(shouldInsertOfflineConversionRow(null) === true, 'insert when missing');
  assert(
    shouldInsertOfflineConversionRow({ order_id: 'LB-2026-1', status: 'pending' }) === false,
    'second enqueue does not insert another row',
  );
  assert(
    shouldInsertOfflineConversionRow({ order_id: 'LB-2026-1', status: 'sent' }) === false,
    'already-sent row stays unique',
  );
}

// --- Return visit without params keeps click id for 90 days ---
{
  const first = mergeAttributionSnapshot(null, { gclid: 'KEEPME', utmCampaign: 'spring' }, now);
  const later = now + 10 * 24 * 60 * 60 * 1000;
  const returned = mergeAttributionSnapshot(first, { landingPage: '/en/catalog' }, later);
  assert(returned.gclid === 'KEEPME', 'direct return keeps gclid');
  assert(isGoogleAdsAttributed(returned, later), 'still attributed within 90 days');
  const expiredAt = now + ATTRIBUTION_WINDOW_MS + 1000;
  const expired = mergeAttributionSnapshot(first, { landingPage: '/en' }, expiredAt);
  assert(!expired.gclid, 'click id dropped after 90 days on a later visit');
  assert(!isGoogleAdsAttributed(expired, expiredAt), 'expired click is not attributed');
}

// --- New Google click replaces previous click ids ---
{
  const first = mergeAttributionSnapshot(null, { gclid: 'OLD', gbraid: 'B1' }, now);
  const next = mergeAttributionSnapshot(first, { gclid: 'NEW' }, now + 60_000);
  assert(next.gclid === 'NEW', 'new gclid wins');
  assert(!next.gbraid, 'old gbraid replaced on new Google click');
}

// --- Cookie codec round-trip ---
{
  const snap = mergeAttributionSnapshot(
    null,
    { gclid: 'abc', utmSource: 'google', utmMedium: 'cpc', landingPage: '/en/?gclid=abc' },
    now,
  );
  const encoded = encodeAttrCookie(snap);
  const decoded = decodeAttrCookie(encoded);
  assert(decoded?.gclid === 'abc', 'cookie round-trip gclid');
  assert(decoded?.utmSource === 'google', 'cookie round-trip utm');
}

// --- Conversion action id parser ---
{
  assert(
    parseGoogleAdsConversionActionId('customers/1234567890/conversionActions/987654321') ===
      '987654321',
    'parses resource name',
  );
  assert(parseGoogleAdsConversionActionId('987654321') === '987654321', 'parses numeric id');
  assert(parseGoogleAdsConversionActionId('nope') === null, 'rejects junk');
}

// --- GTM loader still production-gated ---
{
  const src = readFileSync(join(process.cwd(), 'components/GoogleAnalytics.tsx'), 'utf8');
  assert(src.includes("process.env.NODE_ENV === 'production'"), 'GTM still production-gated');
  assert(src.includes('NEXT_PUBLIC_GTM_ID'), 'GTM still uses public container id');
  assert(src.includes('touchAttributionSession'), 'pathname effect still captures attribution');
  assert(!src.includes("gtag('config'"), 'app still does not add direct gtag config');
}

console.log('attribution.test.ts: all assertions passed');
