import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply, requireMarketingView } from '@/lib/marketing/adminApi';
import { parseCampaignBrief, parseSearchCampaignDraft } from '@/lib/marketing/campaignBuilder/types';
import { getCampaignDraftById, updateCampaignDraft } from '@/lib/marketing/campaignBuilder/store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const draft = await getCampaignDraftById(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ draft });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = await getCampaignDraftById(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (existing.status === 'created') {
    return NextResponse.json({ error: 'Created campaigns cannot be edited.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const patch: Parameters<typeof updateCampaignDraft>[0] = { id };

    if (body.questionAnswers) {
      patch.questionAnswers = body.questionAnswers as Record<string, unknown>;
    }

    if (body.structuredBrief) {
      patch.structuredBrief = parseCampaignBrief(body.structuredBrief);
    }

    if (body.campaignDraft) {
      patch.campaignDraft = parseSearchCampaignDraft(body.campaignDraft);
      patch.status = 'draft';
      patch.validationResult = null;
    }

    if (body.selectedAssetResourceNames) {
      patch.selectedAssetResourceNames = (body.selectedAssetResourceNames as string[]).map(String);
    }

    const updated = await updateCampaignDraft(patch);
    if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

    return NextResponse.json({ draft: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid draft update';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
