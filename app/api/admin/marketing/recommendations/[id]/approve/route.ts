import { NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import {
  getRecommendationById,
  insertApplyAudit,
  updateRecommendationStatus,
} from '@/lib/marketing/recommendations/store';
import { validateRecommendationForApproval } from '@/lib/marketing/safety';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const rec = await getRecommendationById(id);
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (rec.status !== 'new') {
    return NextResponse.json({ error: `Cannot approve recommendation with status "${rec.status}"` }, { status: 400 });
  }

  const validation = validateRecommendationForApproval(rec);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const reviewerEmail = auth.session.user.email ?? 'unknown';
  const updated = await updateRecommendationStatus({
    id,
    status: 'approved',
    reviewerEmail,
  });

  await insertApplyAudit({
    recommendationId: id,
    adminEmail: reviewerEmail,
    action: 'approve',
    actionType: rec.actionType,
    requestJson: { recommendationId: id },
  });

  return NextResponse.json({ recommendation: updated });
}
