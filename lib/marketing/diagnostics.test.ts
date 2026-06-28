/**
 * Marketing diagnostics verdict tests.
 * Run with: npx tsx lib/marketing/diagnostics.test.ts
 */

import { buildDiagnosticsVerdict } from './diagnosticsVerdict';
import type { DiagnosticsMetrics } from './types';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function baseMetrics(overrides: Partial<DiagnosticsMetrics> = {}): DiagnosticsMetrics {
  return {
    paidOrderCount: 0,
    paidOrderRevenue: 0,
    ga4Purchases: 0,
    adsConversions: null,
    adsSpend: null,
    adsClicks: null,
    adsImpressions: null,
    funnelEventCounts: {},
    paidSessions: 0,
    organicSessions: 0,
    paidPurchaseRate: null,
    organicPurchaseRate: null,
    ...overrides,
  };
}

// tracking_ads: real orders but Ads conversions near zero
{
  const v = buildDiagnosticsVerdict(
    baseMetrics({
      paidOrderCount: 5,
      ga4Purchases: 4,
      adsConversions: 0,
      adsClicks: 100,
    }),
  );
  assert(v.code === 'tracking_ads', 'Detects broken Ads conversion tracking');
  assert(v.severity === 'error', 'tracking_ads is error severity');
}

// traffic_no_engagement
{
  const v = buildDiagnosticsVerdict(
    baseMetrics({
      adsClicks: 50,
      funnelEventCounts: { add_to_cart: 0, purchase: 0 },
    }),
  );
  assert(v.code === 'traffic_no_engagement', 'Detects traffic without engagement');
}

// checkout_friction via view_cart
{
  const v = buildDiagnosticsVerdict(
    baseMetrics({
      funnelEventCounts: {
        add_to_cart: 20,
        view_cart: 15,
        begin_checkout: 1,
        add_payment_info: 0,
      },
    }),
  );
  assert(v.code === 'checkout_friction', 'Detects cart to checkout drop-off');
}

// purchase_tag_broken
{
  const v = buildDiagnosticsVerdict(
    baseMetrics({
      ga4Purchases: 0,
      funnelEventCounts: { add_payment_info: 8, purchase: 0 },
    }),
  );
  assert(v.code === 'purchase_tag_broken', 'Detects missing purchase tag');
}

// paid_underperforms
{
  const v = buildDiagnosticsVerdict(
    baseMetrics({
      paidSessions: 100,
      paidPurchaseRate: 0.005,
      organicPurchaseRate: 0.02,
      funnelEventCounts: {
        add_to_cart: 10,
        view_cart: 8,
        begin_checkout: 6,
        add_payment_info: 4,
        purchase: 2,
      },
    }),
  );
  assert(v.code === 'paid_underperforms', 'Detects paid underperformance vs organic');
}

// healthy
{
  const v = buildDiagnosticsVerdict(
    baseMetrics({
      paidOrderCount: 3,
      ga4Purchases: 3,
      adsConversions: 3,
      adsClicks: 20,
      funnelEventCounts: {
        add_to_cart: 10,
        view_cart: 8,
        begin_checkout: 6,
        add_payment_info: 4,
        purchase: 3,
      },
    }),
  );
  assert(v.code === 'healthy', 'Healthy metrics return healthy verdict');
}

console.log('All diagnostics verdict tests passed.');
