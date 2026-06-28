import { NextResponse } from 'next/server';
import { requireMarketingView } from '@/lib/marketing/adminApi';
import { listGoogleAdsImageAssets } from '@/lib/marketing/campaignBuilder/googleAdsAssets';
import { getNegativeKeywordLibraryPreview } from '@/lib/marketing/campaignBuilder/negativeKeywords';
import { isGoogleAdsConfigured } from '@/lib/marketing/config';

export async function GET() {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  const negativeKeywordLibrary = getNegativeKeywordLibraryPreview();
  let assets: Awaited<ReturnType<typeof listGoogleAdsImageAssets>> = [];

  if (isGoogleAdsConfigured()) {
    try {
      assets = await listGoogleAdsImageAssets();
    } catch {
      assets = [];
    }
  }

  return NextResponse.json({ assets, negativeKeywordLibrary });
}
