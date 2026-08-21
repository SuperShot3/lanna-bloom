import { NextRequest, NextResponse } from 'next/server';
import { parseDaysParam, requireMarketingView } from '@/lib/marketing/adminApi';
import { isGoogleAdsConfigured } from '@/lib/marketing/config';
import { formatGoogleAdsApiError } from '@/lib/marketing/googleAdsErrors';
import { fetchAdsOverview } from '@/lib/marketing/googleAdsClient';

export async function GET(request: NextRequest) {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  if (!isGoogleAdsConfigured()) {
    return NextResponse.json(
      {
        error: 'Google Ads is not configured',
        hint: 'Set GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, and GOOGLE_ADS_CUSTOMER_ID.',
      },
      { status: 503 },
    );
  }

  const days = parseDaysParam(request.nextUrl.searchParams.get('days'));

  try {
    const overview = await fetchAdsOverview(days);
    return NextResponse.json({ overview });
  } catch (error) {
    const mapped = formatGoogleAdsApiError(error);
    return NextResponse.json(
      {
        error: mapped.message,
        code: mapped.code,
        hint: mapped.hint,
        canReconnect: mapped.canReconnect,
      },
      { status: mapped.status },
    );
  }
}
