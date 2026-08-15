import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { syncStripeIncome } from '@/lib/accounting/syncStripeIncome';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/accounting/sync-stripe-income
 *
 * Lists succeeded Stripe PaymentIntents (and refunds) in a date range and
 * ensures matching income_records / income_refunds. Idempotent.
 *
 * Body: { dryRun?: boolean, dateFrom?: 'YYYY-MM-DD', dateTo?: 'YYYY-MM-DD' }
 * Defaults to the last 30 Asia/Bangkok calendar days when dates are omitted.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['OWNER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
  } catch {
    /* empty body is fine */
  }

  const createdBy = `admin:${session.user.email ?? 'unknown'}:sync-stripe-income`;
  const result = await syncStripeIncome({
    dryRun: body.dryRun === true,
    dateFrom: body.dateFrom,
    dateTo: body.dateTo,
    createdBy,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.result);
}
