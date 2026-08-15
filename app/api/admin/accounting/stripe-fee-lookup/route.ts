import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { lookupStripePaymentIntentFee } from '@/lib/accounting/syncStripeIncome';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/accounting/stripe-fee-lookup
 * Body: { paymentIntentId: 'pi_…' }
 * Returns { gross, fee, net, feeEstimated } for manual Stripe income entry.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }
  const paymentIntentId =
    typeof (body as { paymentIntentId?: unknown }).paymentIntentId === 'string'
      ? (body as { paymentIntentId: string }).paymentIntentId
      : '';

  const result = await lookupStripePaymentIntentFee(paymentIntentId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    gross: result.gross,
    fee: result.fee,
    net: result.net,
    feeEstimated: result.feeEstimated,
  });
}
