import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply, requireMarketingView } from '@/lib/marketing/adminApi';
import { listCampaignDrafts, insertCampaignDraft } from '@/lib/marketing/campaignBuilder/store';

export async function GET() {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  const drafts = await listCampaignDrafts(50);
  return NextResponse.json({ drafts });
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  const adminEmail = auth.session.user.email ?? 'unknown';
  let body: { campaignGoal?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* optional body */
  }

  const draft = await insertCampaignDraft({
    adminEmail,
    naturalLanguagePrompt: body.campaignGoal?.trim() ?? '',
    wizardStep: 'location',
  });

  return NextResponse.json({ draft }, { status: 201 });
}
