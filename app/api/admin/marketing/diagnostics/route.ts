import { NextRequest, NextResponse } from 'next/server';
import { parseDaysParam, requireMarketingView } from '@/lib/marketing/adminApi';
import { isGa4Configured } from '@/lib/marketing/config';
import { fetchDiagnosticsReport } from '@/lib/marketing/diagnostics';

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
    const diagnostics = await fetchDiagnosticsReport(days);
    return NextResponse.json({ diagnostics });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch diagnostics';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
