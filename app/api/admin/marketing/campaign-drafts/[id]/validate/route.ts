import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import { fetchAndValidateAssetResourceNames } from '@/lib/marketing/campaignBuilder/googleAdsAssets';
import {
  getCampaignDraftById,
  insertCampaignBuilderAudit,
  updateCampaignDraft,
} from '@/lib/marketing/campaignBuilder/store';
import { validateFullCampaignDraft } from '@/lib/marketing/campaignBuilder/validateDraft';
import { isGoogleAdsConfigured } from '@/lib/marketing/config';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  if (!isGoogleAdsConfigured()) {
    return NextResponse.json({ error: 'Google Ads is not configured.' }, { status: 503 });
  }

  const { id } = await context.params;
  const record = await getCampaignDraftById(id);
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!record.campaignDraft || !record.structuredBrief) {
    return NextResponse.json({ error: 'Draft is incomplete.' }, { status: 400 });
  }

  let dryRun = true;
  try {
    const body = await request.json().catch(() => ({}));
    dryRun = body?.dryRun !== false;
  } catch {
    /* default dry run */
  }

  const adminEmail = auth.session.user.email ?? 'unknown';

  if (record.selectedAssetResourceNames.length > 0) {
    const assetCheck = await fetchAndValidateAssetResourceNames(record.selectedAssetResourceNames);
    if (!assetCheck.ok) {
      return NextResponse.json(
        { error: 'Invalid asset selection.', invalidAssets: assetCheck.invalid },
        { status: 400 },
      );
    }
  }

  const validation = validateFullCampaignDraft({
    brief: record.structuredBrief,
    draft: record.campaignDraft,
    dryRun,
  });

  const updated = await updateCampaignDraft({
    id,
    status: validation.ok ? 'validated' : 'draft',
    validationResult: validation,
  });

  await insertCampaignBuilderAudit({
    draftId: id,
    adminEmail,
    action: dryRun ? 'validate_dry_run' : 'validate',
    dryRun,
    requestJson: { draftId: id },
    responseJson: { validation },
  });

  return NextResponse.json({ draft: updated, validation });
}
