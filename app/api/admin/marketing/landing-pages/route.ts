import { NextRequest, NextResponse } from 'next/server';
import { parseDaysParam, requireMarketingView } from '@/lib/marketing/adminApi';
import { isGa4Configured } from '@/lib/marketing/config';
import { fetchPaidLandingPages } from '@/lib/marketing/ga4Client';

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

  try {
    const landingPages = await fetchPaidLandingPages(days);
    return NextResponse.json({ landingPages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch landing pages';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
