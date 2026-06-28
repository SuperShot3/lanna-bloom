import { NextRequest, NextResponse } from 'next/server';
import { parseDaysParam, requireMarketingView } from '@/lib/marketing/adminApi';
import { isGoogleAdsConfigured } from '@/lib/marketing/config';
import { fetchFunnelReport } from '@/lib/marketing/ga4Client';
import { fetchAdsOverview } from '@/lib/marketing/googleAdsClient';
import { fetchDiagnosticsReport } from '@/lib/marketing/diagnostics';
import { generateRecommendationDrafts } from '@/lib/marketing/recommendations/generate';
import { insertRecommendations } from '@/lib/marketing/recommendations/store';

export async function POST(request: NextRequest) {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  if (!isGoogleAdsConfigured()) {
    return NextResponse.json({ error: 'Google Ads is not configured' }, { status: 503 });
  }

  const days = parseDaysParam(request.nextUrl.searchParams.get('days'));
  let includeLlm = true;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body.includeLlm === 'boolean') includeLlm = body.includeLlm;
  } catch {
    /* default */
  }

  try {
    const overview = await fetchAdsOverview(days);
    let funnel = null;
    let diagnosticsMetrics = null;
    try {
      funnel = await fetchFunnelReport(days);
    } catch {
      /* GA4 optional for generation */
    }
    try {
      const diagnostics = await fetchDiagnosticsReport(days);
      diagnosticsMetrics = diagnostics.metrics;
      if (!funnel) {
        funnel = {
          dateFrom: diagnostics.dateFrom,
          dateTo: diagnostics.dateTo,
          steps: Object.entries(diagnostics.metrics.funnelEventCounts).map(([event, count]) => ({
            event,
            label: event,
            count,
            dropoffFromPrevious: null,
            dropoffRateFromPrevious: null,
            rateFromPrevious: null,
            rateFromTop: null,
          })),
          paidSessions: diagnostics.metrics.paidSessions,
          organicSessions: diagnostics.metrics.organicSessions,
          paidPurchaseRate: diagnostics.metrics.paidPurchaseRate,
          organicPurchaseRate: diagnostics.metrics.organicPurchaseRate,
        };
      }
    } catch {
      /* diagnostics optional */
    }

    const { drafts, llmModel, llmPromptVersion } = await generateRecommendationDrafts({
      overview,
      funnel,
      diagnosticsMetrics,
      includeLlm,
    });

    if (drafts.length === 0) {
      return NextResponse.json({ recommendations: [], message: 'No recommendations generated for this period.' });
    }

    const recommendations = await insertRecommendations({
      drafts,
      metricsSnapshot: { overview, funnel },
      llmModel,
      llmPromptVersion,
    });

    return NextResponse.json({ recommendations, count: recommendations.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate recommendations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
