import 'server-only';

import { isGa4Configured, isGoogleAdsConfigured } from './config';
import { buildDiagnosticsVerdict } from './diagnosticsVerdict';
import { fetchFunnelReport, fetchTrackingHealth, getPaidOrderStats } from './ga4Client';
import { fetchAdsOverview } from './googleAdsClient';
import { resolveDateRange } from './metrics';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { DiagnosticsMetrics, DiagnosticsReport } from './types';

export { buildDiagnosticsVerdict } from './diagnosticsVerdict';

function funnelEventCountsFromReport(
  steps: { event: string; count: number }[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const step of steps) {
    counts[step.event] = step.count;
  }
  return counts;
}

export async function fetchDiagnosticsReport(
  days: number,
): Promise<DiagnosticsReport> {
  const { dateFrom, dateTo } = resolveDateRange(days);
  const ga4 = isGa4Configured();
  const googleAds = isGoogleAdsConfigured();
  const supabase = Boolean(getSupabaseAdmin());

  if (!ga4) {
    throw new Error('GA4 is not configured');
  }

  const [funnel, orderStats, adsResult] = await Promise.all([
    fetchFunnelReport(days),
    getPaidOrderStats(dateFrom, dateTo),
    googleAds
      ? fetchAdsOverview(days).catch(() => null)
      : Promise.resolve(null),
  ]);

  let adsConversions: number | null = null;
  let adsSpend: number | null = null;
  let adsClicks: number | null = null;
  let adsImpressions: number | null = null;

  if (adsResult) {
    adsConversions = adsResult.summary.conversions;
    adsSpend = adsResult.summary.spend;
    adsClicks = adsResult.summary.clicks;
    adsImpressions = adsResult.summary.impressions;
  }

  const healthWithAds = await fetchTrackingHealth(days, adsConversions ?? undefined);
  const checks = healthWithAds.checks;

  const funnelEventCounts = funnelEventCountsFromReport(funnel.steps);
  const ga4Purchases = funnelEventCounts.purchase ?? 0;

  const metrics: DiagnosticsMetrics = {
    paidOrderCount: orderStats.count,
    paidOrderRevenue: orderStats.revenue,
    ga4Purchases,
    adsConversions,
    adsSpend,
    adsClicks,
    adsImpressions,
    funnelEventCounts,
    paidSessions: funnel.paidSessions,
    organicSessions: funnel.organicSessions,
    paidPurchaseRate: funnel.paidPurchaseRate,
    organicPurchaseRate: funnel.organicPurchaseRate,
  };

  const verdict = buildDiagnosticsVerdict(metrics);

  return {
    dateFrom,
    dateTo,
    metrics,
    verdict,
    checks,
    configured: { ga4, googleAds, supabase },
  };
}
