import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { getOrCreateCustomerByEmail, issueCredit } from '@/lib/rewards/creditLedger';
import { filterKnownEmails } from '@/lib/rewards/knownContacts';

export const dynamic = 'force-dynamic';

/**
 * Manual, ad-hoc store-credit issuance (Phase 1: validates the ledger end-to-end
 * before magic-link auth, checkout integration, or campaigns exist). The
 * customer id and the limits are always resolved/enforced server-side — the
 * client only ever supplies an email and a requested amount, never a customer id.
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
  const b = body as Record<string, unknown>;

  const email = typeof b.email === 'string' ? b.email.trim() : '';
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  const notes = typeof b.notes === 'string' ? b.notes.trim().slice(0, 500) : null;

  const known = await filterKnownEmails([email]);
  if (!known.has(email.toLowerCase())) {
    return NextResponse.json(
      { error: 'This email is not in your contacts (no orders or newsletter signup). Credit can only go to known contacts.' },
      { status: 400 }
    );
  }

  const customerResult = await getOrCreateCustomerByEmail(email);
  if (!customerResult.ok) {
    return NextResponse.json({ error: customerResult.error }, { status: 500 });
  }

  const adminEmail = authResult.session.user.email ?? 'unknown-admin';

  const issueResult = await issueCredit({
    customerId: customerResult.data.id,
    amount,
    createdBy: `admin:${adminEmail}`,
    notes,
  });

  if (!issueResult.ok) {
    const status = issueResult.error === 'invalid_or_over_reward_limit' || issueResult.error === 'exceeds_max_balance' ? 400 : 500;
    return NextResponse.json({ error: issueResult.error }, { status });
  }

  await logAudit(adminEmail, 'REWARD_CREDIT_ISSUE', null, {
    customerId: customerResult.data.id,
    customerEmail: customerResult.data.email,
    amount,
    notes,
    transactionId: issueResult.data.id,
  });

  return NextResponse.json({ transaction: issueResult.data, customer: customerResult.data }, { status: 201 });
}
