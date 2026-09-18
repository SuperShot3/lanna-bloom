import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { getOrCreateCustomerByEmail, issueCredit } from '@/lib/rewards/creditLedger';
import { filterKnownEmails } from '@/lib/rewards/knownContacts';

export const dynamic = 'force-dynamic';

const MAX_RECIPIENTS = 200;

/**
 * Issues the same credit amount to many known contacts. Emails not already in
 * orders/newsletter/customers are refused; the DB RPC still enforces the
 * per-reward and max-balance limits per recipient, so one bad row never blocks
 * the others.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  let body: { emails?: unknown; amount?: unknown; notes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const emails = Array.isArray(body.emails)
    ? Array.from(
        new Set(body.emails.filter((e): e is string => typeof e === 'string').map((e) => e.trim().toLowerCase()))
      )
    : [];
  if (emails.length === 0 || emails.length > MAX_RECIPIENTS) {
    return NextResponse.json({ error: `Select 1-${MAX_RECIPIENTS} recipients` }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : null;

  const known = await filterKnownEmails(emails);
  const adminEmail = authResult.session.user.email ?? 'unknown-admin';
  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const email of emails) {
    if (!known.has(email)) {
      results.push({ email, ok: false, error: 'not_a_known_contact' });
      continue;
    }
    const customer = await getOrCreateCustomerByEmail(email);
    if (!customer.ok) {
      results.push({ email, ok: false, error: customer.error });
      continue;
    }
    const issued = await issueCredit({
      customerId: customer.data.id,
      amount,
      createdBy: `admin:${adminEmail}`,
      notes,
    });
    results.push(issued.ok ? { email, ok: true } : { email, ok: false, error: issued.error });
  }

  const succeeded = results.filter((r) => r.ok).length;
  await logAudit(adminEmail, 'REWARD_CREDIT_ISSUE_BULK', null, {
    amount,
    notes,
    requested: emails.length,
    succeeded,
  });

  return NextResponse.json({ results, succeeded, failed: results.length - succeeded });
}
