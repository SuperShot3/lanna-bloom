import { NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import {
  getRecommendationById,
  insertApplyAudit,
  updateRecommendationStatus,
} from '@/lib/marketing/recommendations/store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const rec = await getRecommendationById(id);
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (rec.status !== 'new' && rec.status !== 'approved') {
    return NextResponse.json({ error: `Cannot reject recommendation with status "${rec.status}"` }, { status: 400 });
  }

  const reviewerEmail = auth.session.user.email ?? 'unknown';
  const updated = await updateRecommendationStatus({
    id,
    status: 'rejected',
    reviewerEmail,
  });

  await insertApplyAudit({
    recommendationId: id,
    adminEmail: reviewerEmail,
    action: 'reject',
    actionType: rec.actionType,
  });

  return NextResponse.json({ recommendation: updated });
}
