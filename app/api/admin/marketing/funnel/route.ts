import { NextRequest, NextResponse } from 'next/server';
import { parseDaysParam, requireMarketingView } from '@/lib/marketing/adminApi';
import { isGa4Configured } from '@/lib/marketing/config';
import { fetchFunnelReport } from '@/lib/marketing/ga4Client';

export async function GET(request: NextRequest) {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  if (!isGa4Configured()) {
    return NextResponse.json(
      {
        error: 'GA4 is not configured',
        hint: 'Set GA4_PROPERTY_ID and GOOGLE_SERVICE_ACCOUNT_JSON (or email + private key).',
      },
      { status: 503 },
    );
  }

  const days = parseDaysParam(request.nextUrl.searchParams.get('days'));

  try {
    const funnel = await fetchFunnelReport(days);
    return NextResponse.json({ funnel });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch GA4 funnel data';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
