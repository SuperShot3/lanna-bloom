import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import { createPausedSearchCampaign } from '@/lib/marketing/campaignBuilder/googleAdsCreateSearchCampaign';
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

  if (record.status === 'created') {
    return NextResponse.json({ error: 'Campaign already created.' }, { status: 400 });
  }

  if (!record.campaignDraft || !record.structuredBrief) {
    return NextResponse.json({ error: 'Draft is incomplete.' }, { status: 400 });
  }

  const isWizard = record.promptVersion === 'campaign-builder-v2-wizard';
  if (isWizard) {
    const requiredSteps = ['location', 'audience', 'ad_groups', 'keywords', 'negative_keywords', 'ad_copy'];
    const missing = requiredSteps.filter((s) => !record.stepApprovals[s]?.approvedAt);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'All wizard steps must be approved before create.', missingSteps: missing },
        { status: 400 },
      );
    }
  }

  let dryRun = false;
  try {
    const body = await request.json().catch(() => ({}));
    dryRun = Boolean(body?.dryRun);
  } catch {
    /* default live create */
  }

  const adminEmail = auth.session.user.email ?? 'unknown';

  const validation = validateFullCampaignDraft({
    brief: record.structuredBrief,
    draft: record.campaignDraft,
    dryRun,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: 'Validation failed.', validation }, { status: 400 });
  }

  if (record.selectedAssetResourceNames.length > 0) {
    const assetCheck = await fetchAndValidateAssetResourceNames(record.selectedAssetResourceNames);
    if (!assetCheck.ok) {
      return NextResponse.json(
        { error: 'Invalid asset selection.', invalidAssets: assetCheck.invalid },
        { status: 400 },
      );
    }
  }

  try {
    const result = await createPausedSearchCampaign(record.campaignDraft, {
      dryRun,
      selectedAssetResourceNames: record.selectedAssetResourceNames,
    });

    await insertCampaignBuilderAudit({
      draftId: id,
      adminEmail,
      action: dryRun ? 'create_dry_run' : 'create',
      dryRun,
      requestJson: {
        campaignName: record.campaignDraft.campaignName,
        selectedAssets: record.selectedAssetResourceNames,
      },
      responseJson: { resourceNames: result.resourceNames },
    });

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        resourceNames: result.resourceNames,
        validation,
      });
    }

    const updated = await updateCampaignDraft({
      id,
      status: 'created',
      validationResult: validation,
      googleAdsResourceNames: { resourceNames: result.resourceNames },
      applyError: null,
    });

    return NextResponse.json({
      draft: updated,
      resourceNames: result.resourceNames,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Campaign creation failed';

    await insertCampaignBuilderAudit({
      draftId: id,
      adminEmail,
      action: 'create_failed',
      dryRun,
      errorMessage: message,
    });

    await updateCampaignDraft({
      id,
      status: 'failed',
      applyError: message,
    });

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
