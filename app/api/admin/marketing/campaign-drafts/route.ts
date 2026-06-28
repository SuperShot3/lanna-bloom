import { NextResponse } from 'next/server';
import { requireMarketingView } from '@/lib/marketing/adminApi';
import { listCampaignDrafts } from '@/lib/marketing/campaignBuilder/store';

export async function GET() {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  const drafts = await listCampaignDrafts(50);
  return NextResponse.json({ drafts });
}
