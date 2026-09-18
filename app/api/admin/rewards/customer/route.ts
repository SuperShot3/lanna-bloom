import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getCustomerByEmail, getCustomerBalance, listCustomerTransactions } from '@/lib/rewards/creditLedger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const email = request.nextUrl.searchParams.get('email')?.trim();
  if (!email) {
    return NextResponse.json({ error: 'email query param is required' }, { status: 400 });
  }

  const customerResult = await getCustomerByEmail(email);
  if (!customerResult.ok) {
    return NextResponse.json({ error: customerResult.error }, { status: 500 });
  }
  if (!customerResult.data) {
    return NextResponse.json({ customer: null, balance: 0, transactions: [] });
  }

  const [balanceResult, transactionsResult] = await Promise.all([
    getCustomerBalance(customerResult.data.id),
    listCustomerTransactions(customerResult.data.id),
  ]);

  if (!balanceResult.ok) return NextResponse.json({ error: balanceResult.error }, { status: 500 });
  if (!transactionsResult.ok) return NextResponse.json({ error: transactionsResult.error }, { status: 500 });

  return NextResponse.json({
    customer: customerResult.data,
    balance: balanceResult.data,
    transactions: transactionsResult.data,
  });
}
