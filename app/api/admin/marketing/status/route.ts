import { NextResponse } from 'next/server';
import { requireMarketingView } from '@/lib/marketing/adminApi';
import { getMarketingConfigStatus } from '@/lib/marketing/config';
import { loadStoredGoogleAdsOAuth } from '@/lib/marketing/googleAdsOAuthStore';

export async function GET() {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  const stored = await loadStoredGoogleAdsOAuth();
  return NextResponse.json({
    config: getMarketingConfigStatus(
      stored
        ? { connectedAt: stored.connectedAt, connectedByEmail: stored.connectedByEmail }
        : undefined,
    ),
  });
}
