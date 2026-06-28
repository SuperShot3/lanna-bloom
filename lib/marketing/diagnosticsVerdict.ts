import type { DiagnosticsMetrics, DiagnosticsVerdict, DiagnosticsVerdictCode } from './types';

function approxZero(n: number, threshold = 0): boolean {
  return n <= threshold;
}

export function buildDiagnosticsVerdict(metrics: DiagnosticsMetrics): DiagnosticsVerdict {
  const {
    paidOrderCount,
    ga4Purchases,
    adsConversions,
    adsClicks,
    funnelEventCounts,
    paidPurchaseRate,
    organicPurchaseRate,
  } = metrics;

  const addToCart = funnelEventCounts.add_to_cart ?? 0;
  const viewCart = funnelEventCounts.view_cart ?? 0;
  const beginCheckout = funnelEventCounts.begin_checkout ?? 0;
  const addPaymentInfo = funnelEventCounts.add_payment_info ?? 0;

  let code: DiagnosticsVerdictCode = 'healthy';
  let severity: DiagnosticsVerdict['severity'] = 'ok';
  let title = 'No obvious leak detected';
  let message =
    'Paid orders, GA4 funnel events, and ad metrics look reasonably aligned for this period.';
  const nextSteps: string[] = [];

  if (paidOrderCount > 0 && adsConversions != null && adsConversions < Math.max(1, paidOrderCount * 0.15)) {
    code = 'tracking_ads';
    severity = 'error';
    title = 'Google Ads conversion tracking may be broken';
    message = `You have ${paidOrderCount} paid order(s) in Supabase but Google Ads reported only ${adsConversions} conversion(s). Real revenue exists — the Ads purchase tag is likely missing or misconfigured.`;
    nextSteps.push('Verify GTM fires a Google Ads conversion tag on the `purchase` custom event.');
    nextSteps.push('Confirm the purchase conversion action is marked Primary in Google Ads.');
    nextSteps.push('Complete a test order in production and check Ads conversion diagnostics.');
  } else if (
    approxZero(paidOrderCount) &&
    approxZero(ga4Purchases) &&
    adsClicks != null &&
    adsClicks > 30
  ) {
    code = 'traffic_no_engagement';
    severity = 'warn';
    title = 'Traffic arrives but users are not engaging';
    message = `${adsClicks} ad clicks but no add-to-cart or purchase activity — check landing page relevance, delivery area messaging, and search intent.`;
    nextSteps.push('Review paid landing pages in the Funnel tab.');
    nextSteps.push('Confirm English campaigns use `/en/` final URLs.');
    nextSteps.push('Check that delivery area and pricing are clear above the fold on mobile.');
  } else if (
    addToCart >= 5 &&
    beginCheckout < addToCart * 0.25 &&
    addPaymentInfo < addToCart * 0.15
  ) {
    code = 'checkout_friction';
    severity = 'warn';
    title = 'Cart interest but checkout drop-off';
    message = `${addToCart} add-to-cart events but only ${beginCheckout} begin_checkout — users may be stuck on cart or delivery form (especially mobile).`;
    nextSteps.push('Test cart → checkout on a phone; check delivery date/area fields.');
    nextSteps.push('See funnel drop-off in the Funnel tab.');
    nextSteps.push('Review delivery fee messaging before payment.');
  } else if (viewCart >= 10 && beginCheckout < viewCart * 0.2) {
    code = 'checkout_friction';
    severity = 'warn';
    title = 'Cart views not converting to checkout';
    message = `${viewCart} view_cart events but only ${beginCheckout} begin_checkout (${Math.round((beginCheckout / viewCart) * 100)}% progression).`;
    nextSteps.push('Review cart page CTA and mobile checkout button visibility.');
    nextSteps.push('Check for JavaScript errors on the cart page.');
  } else if (addPaymentInfo >= 5 && ga4Purchases === 0) {
    code = 'purchase_tag_broken';
    severity = 'error';
    title = 'Payments started but purchase event missing';
    message = `${addPaymentInfo} payment clicks but 0 GA4 purchase events — GTM purchase tag on /lanna-order-thank-you may be broken.`;
    nextSteps.push('Verify GTM purchase trigger fires on custom event `purchase` on thank-you page.');
    nextSteps.push('Complete a test order and check GA4 Realtime for purchase.');
    nextSteps.push('See docs/GOOGLE_ADS_PURCHASE_CONVERSION.md.');
  } else if (
    paidPurchaseRate != null &&
    organicPurchaseRate != null &&
    organicPurchaseRate > 0.005 &&
    paidPurchaseRate < organicPurchaseRate * 0.5 &&
    metrics.paidSessions >= 20
  ) {
    code = 'paid_underperforms';
    severity = 'warn';
    title = 'Paid traffic converts worse than organic';
    message = `Paid session purchase rate (${(paidPurchaseRate * 100).toFixed(2)}%) is much lower than organic (${(organicPurchaseRate * 100).toFixed(2)}%) — landing page or keyword mismatch.`;
    nextSteps.push('Review paid landing pages and search terms.');
    nextSteps.push('Confirm ad final URLs match campaign language (/en/ for English).');
    nextSteps.push('Use the Ads tab waste filter to find spend with zero conversions.');
  }

  if (code === 'healthy') {
    nextSteps.push('Monitor funnel and search terms weekly.');
    nextSteps.push('Use Generate recommendations when Ads data is available.');
  }

  return { code, severity, title, message, nextSteps };
}
