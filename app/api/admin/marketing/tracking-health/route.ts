import { NextRequest, NextResponse } from 'next/server';
import { parseDaysParam, requireMarketingView } from '@/lib/marketing/adminApi';
import { isGa4Configured, isGoogleAdsConfigured } from '@/lib/marketing/config';
import { fetchTrackingHealth } from '@/lib/marketing/ga4Client';
import { fetchAdsOverview } from '@/lib/marketing/googleAdsClient';

export async function GET(request: NextRequest) {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  if (!isGa4Configured()) {
    return NextResponse.json(
      {
        error: 'GA4 is not configured',
        hint: 'Set GA4_PROPERTY_ID and GOOGLE_SERVICE_ACCOUNT_JSON.',
      },
      { status: 503 },
    );
  }

  const days = parseDaysParam(request.nextUrl.searchParams.get('days'));
  let adsConversions: number | undefined;

  if (isGoogleAdsConfigured()) {
    try {
      const overview = await fetchAdsOverview(days);
      adsConversions = overview.summary.conversions;
    } catch {
      /* optional cross-check */
    }
  }

  try {
    const health = await fetchTrackingHealth(days, adsConversions);
    return NextResponse.json({ health });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tracking health';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
