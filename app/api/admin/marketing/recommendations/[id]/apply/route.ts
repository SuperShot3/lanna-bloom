import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import { applyRecommendationToGoogleAds } from '@/lib/marketing/apply/googleAdsMutations';
import {
  getRecommendationById,
  insertApplyAudit,
  updateRecommendationStatus,
} from '@/lib/marketing/recommendations/store';
import { isAllowedApplyAction, validateRecommendationForApproval } from '@/lib/marketing/safety';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const rec = await getRecommendationById(id);
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (rec.status !== 'approved') {
    return NextResponse.json(
      { error: 'Recommendation must be approved before applying.' },
      { status: 400 },
    );
  }

  if (!isAllowedApplyAction(rec.actionType)) {
    return NextResponse.json({ error: 'This action type cannot be applied via API.' }, { status: 400 });
  }

  const validation = validateRecommendationForApproval(rec);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  let dryRun = false;
  try {
    const body = await request.json().catch(() => ({}));
    dryRun = Boolean(body?.dryRun);
  } catch {
    /* default */
  }

  const reviewerEmail = auth.session.user.email ?? 'unknown';

  try {
    const result = await applyRecommendationToGoogleAds(rec, { dryRun });

    await insertApplyAudit({
      recommendationId: id,
      adminEmail: reviewerEmail,
      action: dryRun ? 'apply_dry_run' : 'apply',
      actionType: rec.actionType,
      dryRun,
      requestJson: { recommendationId: id, proposedChange: rec.proposedChange },
      responseJson: { resourceNames: result.resourceNames },
    });

    if (dryRun) {
      return NextResponse.json({ dryRun: true, resourceNames: result.resourceNames });
    }

    const updated = await updateRecommendationStatus({
      id,
      status: 'applied',
      reviewerEmail,
      googleAdsResourceNames: { resourceNames: result.resourceNames },
    });

    return NextResponse.json({ recommendation: updated, resourceNames: result.resourceNames });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Apply failed';
    await insertApplyAudit({
      recommendationId: id,
      adminEmail: reviewerEmail,
      action: 'apply_failed',
      actionType: rec.actionType,
      errorMessage: message,
    });
    await updateRecommendationStatus({
      id,
      status: 'failed',
      applyError: message,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
