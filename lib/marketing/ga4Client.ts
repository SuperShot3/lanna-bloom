import 'server-only';

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { cacheKey, getCached, setCached } from './cache';
import { getGa4Config, MARKETING_SAFETY } from './config';
import { resolveDateRange } from './metrics';
import type {
  FunnelReport,
  FunnelStep,
  PaidLandingPageRow,
  PaidLandingPagesReport,
  TrackingHealthCheck,
  TrackingHealthReport,
} from './types';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const FUNNEL_EVENTS = [
  { event: 'view_item', label: 'View item' },
  { event: 'add_to_cart', label: 'Add to cart' },
  { event: 'view_cart', label: 'View cart' },
  { event: 'begin_checkout', label: 'Begin checkout' },
  { event: 'add_shipping_info', label: 'Shipping info' },
  { event: 'add_payment_info', label: 'Payment click' },
  { event: 'purchase', label: 'Purchase' },
] as const;

function getClient(): BetaAnalyticsDataClient {
  const config = getGa4Config();
  if (!config) throw new Error('GA4 is not configured');
  return new BetaAnalyticsDataClient({ credentials: config.credentials });
}

function propertyName(): string {
  const config = getGa4Config();
  if (!config) throw new Error('GA4 is not configured');
  return `properties/${config.propertyId}`;
}

async function runEventCounts(
  dateFrom: string,
  dateTo: string,
  eventNames: string[],
): Promise<Record<string, number>> {
  const key = cacheKey(['ga4', 'events', dateFrom, dateTo, ...eventNames]);
  const cached = getCached<Record<string, number>>(key);
  if (cached) return cached;

  const client = getClient();
  const [response] = await client.runReport({
    property: propertyName(),
    dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: eventNames },
      },
    },
    limit: 50,
  });

  const counts: Record<string, number> = {};
  for (const name of eventNames) counts[name] = 0;
  for (const row of response.rows ?? []) {
    const event = row.dimensionValues?.[0]?.value;
    const count = Number(row.metricValues?.[0]?.value ?? 0);
    if (event) counts[event] = count;
  }

  setCached(key, counts);
  return counts;
}

async function runChannelPurchaseRates(
  dateFrom: string,
  dateTo: string,
): Promise<{ paidSessions: number; organicSessions: number; paidPurchases: number; organicPurchases: number }> {
  const key = cacheKey(['ga4', 'channel-purchase', dateFrom, dateTo]);
  const cached = getCached<{
    paidSessions: number;
    organicSessions: number;
    paidPurchases: number;
    organicPurchases: number;
  }>(key);
  if (cached) return cached;

  const client = getClient();
  const [response] = await client.runReport({
    property: propertyName(),
    dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'conversions' }],
    limit: 20,
  });

  let paidSessions = 0;
  let organicSessions = 0;
  let paidPurchases = 0;
  let organicPurchases = 0;

  for (const row of response.rows ?? []) {
    const channel = row.dimensionValues?.[0]?.value ?? '';
    const sessions = Number(row.metricValues?.[0]?.value ?? 0);
    const conversions = Number(row.metricValues?.[1]?.value ?? 0);
    const lower = channel.toLowerCase();
    if (lower.includes('paid') || lower === 'paid search' || lower === 'paid social') {
      paidSessions += sessions;
      paidPurchases += conversions;
    } else if (lower.includes('organic')) {
      organicSessions += sessions;
      organicPurchases += conversions;
    }
  }

  const result = { paidSessions, organicSessions, paidPurchases, organicPurchases };
  setCached(key, result);
  return result;
}

function buildFunnelSteps(counts: Record<string, number>): FunnelStep[] {
  const steps: FunnelStep[] = [];
  let previous: number | null = null;
  const topCount = counts[FUNNEL_EVENTS[0].event] ?? 0;

  for (const { event, label } of FUNNEL_EVENTS) {
    const count = counts[event] ?? 0;
    let dropoffFromPrevious: number | null = null;
    let dropoffRateFromPrevious: number | null = null;
    let rateFromPrevious: number | null = null;
    let rateFromTop: number | null = null;

    if (previous != null && previous > 0) {
      dropoffFromPrevious = previous - count;
      dropoffRateFromPrevious = dropoffFromPrevious / previous;
      rateFromPrevious = count / previous;
    }
    if (topCount > 0) {
      rateFromTop = count / topCount;
    }

    steps.push({
      event,
      label,
      count,
      dropoffFromPrevious,
      dropoffRateFromPrevious,
      rateFromPrevious,
      rateFromTop,
    });
    previous = count;
  }

  return steps;
}

export async function fetchFunnelReport(days: number = MARKETING_SAFETY.defaultLookbackDays): Promise<FunnelReport> {
  const { dateFrom, dateTo } = resolveDateRange(days);
  const eventNames = FUNNEL_EVENTS.map((e) => e.event);
  const [counts, channel] = await Promise.all([
    runEventCounts(dateFrom, dateTo, [...eventNames]),
    runChannelPurchaseRates(dateFrom, dateTo),
  ]);

  return {
    dateFrom,
    dateTo,
    steps: buildFunnelSteps(counts),
    paidSessions: channel.paidSessions,
    organicSessions: channel.organicSessions,
    paidPurchaseRate:
      channel.paidSessions > 0 ? channel.paidPurchases / channel.paidSessions : null,
    organicPurchaseRate:
      channel.organicSessions > 0 ? channel.organicPurchases / channel.organicSessions : null,
  };
}

export interface PaidOrderStats {
  count: number;
  revenue: number;
}

export async function getPaidOrderStats(
  dateFrom: string,
  dateTo: string,
): Promise<PaidOrderStats> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { count: 0, revenue: 0 };

  const { data, error } = await supabase
    .from('orders')
    .select('grand_total, total_amount')
    .eq('payment_status', 'PAID')
    .gte('paid_at', `${dateFrom}T00:00:00.000Z`)
    .lte('paid_at', `${dateTo}T23:59:59.999Z`);

  if (error || !data) return { count: 0, revenue: 0 };

  const revenue = data.reduce((sum, row) => {
    const amount = Number(row.grand_total ?? row.total_amount ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  return { count: data.length, revenue };
}

async function countPaidOrders(dateFrom: string, dateTo: string): Promise<number> {
  const stats = await getPaidOrderStats(dateFrom, dateTo);
  return stats.count;
}

function isThaiLandingPath(path: string): boolean {
  return /\/th(\/|$|\?)/i.test(path);
}

export async function fetchPaidLandingPages(
  days: number = MARKETING_SAFETY.defaultLookbackDays,
): Promise<PaidLandingPagesReport> {
  const { dateFrom, dateTo } = resolveDateRange(days);
  const key = cacheKey(['ga4', 'paid-landing-pages', dateFrom, dateTo]);
  const cached = getCached<PaidLandingPagesReport>(key);
  if (cached) return cached;

  const client = getClient();
  const paidChannelFilter = {
    filter: {
      fieldName: 'sessionDefaultChannelGroup',
      stringFilter: { matchType: 'CONTAINS' as const, value: 'Paid', caseSensitive: false },
    },
  };

  const [sessionsResponse, cartResponse, purchaseResponse] = await Promise.all([
    client.runReport({
      property: propertyName(),
      dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: paidChannelFilter,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 15,
    }),
    client.runReport({
      property: propertyName(),
      dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            paidChannelFilter,
            {
              filter: {
                fieldName: 'eventName',
                stringFilter: { matchType: 'EXACT', value: 'add_to_cart' },
              },
            },
          ],
        },
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 50,
    }),
    client.runReport({
      property: propertyName(),
      dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            paidChannelFilter,
            {
              filter: {
                fieldName: 'eventName',
                stringFilter: { matchType: 'EXACT', value: 'purchase' },
              },
            },
          ],
        },
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 50,
    }),
  ]);

  const cartByPage = new Map<string, number>();
  for (const row of cartResponse[0].rows ?? []) {
    const page = row.dimensionValues?.[0]?.value ?? '';
    if (page) cartByPage.set(page, Number(row.metricValues?.[0]?.value ?? 0));
  }

  const purchaseByPage = new Map<string, number>();
  for (const row of purchaseResponse[0].rows ?? []) {
    const page = row.dimensionValues?.[0]?.value ?? '';
    if (page) purchaseByPage.set(page, Number(row.metricValues?.[0]?.value ?? 0));
  }

  const pages: PaidLandingPageRow[] = [];
  for (const row of sessionsResponse[0].rows ?? []) {
    const landingPage = row.dimensionValues?.[0]?.value ?? '';
    if (!landingPage) continue;
    pages.push({
      landingPage,
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      addToCart: cartByPage.get(landingPage) ?? 0,
      purchases: purchaseByPage.get(landingPage) ?? 0,
      localeMismatch: isThaiLandingPath(landingPage),
    });
  }

  const result: PaidLandingPagesReport = { dateFrom, dateTo, pages };
  setCached(key, result);
  return result;
}

export async function fetchTrackingHealth(
  days: number = MARKETING_SAFETY.defaultLookbackDays,
  adsConversions?: number,
): Promise<TrackingHealthReport> {
  const { dateFrom, dateTo } = resolveDateRange(days);
  const eventNames = FUNNEL_EVENTS.map((e) => e.event);
  const [counts, paidOrders] = await Promise.all([
    runEventCounts(dateFrom, dateTo, [...eventNames]),
    countPaidOrders(dateFrom, dateTo),
  ]);

  const checks: TrackingHealthCheck[] = [];
  const ga4Purchases = counts.purchase ?? 0;
  const paymentClicks = counts.add_payment_info ?? 0;

  for (const { event, label } of FUNNEL_EVENTS) {
    if ((counts[event] ?? 0) === 0) {
      checks.push({
        code: `zero_${event}`,
        status: event === 'purchase' ? 'error' : 'warn',
        title: `No ${label} events`,
        detail: `GA4 reported 0 "${event}" events in the last ${days} days.`,
        ga4Value: 0,
      });
    }
  }

  if (paidOrders > 0 && ga4Purchases < paidOrders * 0.5) {
    checks.push({
      code: 'ga4_purchases_below_orders',
      status: 'error',
      title: 'GA4 purchases much lower than paid orders',
      detail: `GA4 purchase events (${ga4Purchases}) are far below Supabase paid orders (${paidOrders}). Tracking may be broken.`,
      ga4Value: ga4Purchases,
      referenceValue: paidOrders,
    });
  } else if (paidOrders > 0 && ga4Purchases < paidOrders * 0.85) {
    checks.push({
      code: 'ga4_purchases_slightly_low',
      status: 'warn',
      title: 'GA4 purchases slightly below paid orders',
      detail: `GA4 (${ga4Purchases}) vs paid orders (${paidOrders}) — check consent, ad blockers, or timing.`,
      ga4Value: ga4Purchases,
      referenceValue: paidOrders,
    });
  } else if (paidOrders > 0) {
    checks.push({
      code: 'ga4_purchases_aligned',
      status: 'ok',
      title: 'GA4 purchases aligned with orders',
      detail: `GA4 purchase count (${ga4Purchases}) is in line with paid orders (${paidOrders}).`,
      ga4Value: ga4Purchases,
      referenceValue: paidOrders,
    });
  }

  if (paymentClicks > 5 && ga4Purchases === 0) {
    checks.push({
      code: 'payment_without_purchase',
      status: 'error',
      title: 'Payment clicks but no purchases',
      detail: `${paymentClicks} add_payment_info events but 0 purchase events — checkout or purchase tag may be broken.`,
      ga4Value: ga4Purchases,
      referenceValue: paymentClicks,
    });
  }

  if (adsConversions != null && ga4Purchases > 0 && adsConversions < ga4Purchases * 0.5) {
    checks.push({
      code: 'ads_conversions_below_ga4',
      status: 'warn',
      title: 'Google Ads conversions below GA4 purchases',
      detail: `Ads reported ${adsConversions} conversions vs GA4 ${ga4Purchases} purchases.`,
      ga4Value: ga4Purchases,
      referenceValue: adsConversions,
    });
  }

  if (checks.length === 0) {
    checks.push({
      code: 'all_ok',
      status: 'ok',
      title: 'No tracking issues detected',
      detail: 'Funnel events and order counts look healthy for this period.',
    });
  }

  return { dateFrom, dateTo, checks };
}
