import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { sendOutboxViaResend } from '@/lib/email/sendOutboxEmail';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['OWNER', 'MANAGER']);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const adminEmail = auth.session.user.email ?? 'unknown';
  const r = await sendOutboxViaResend(id, adminEmail);
  if (r.ok) {
    return NextResponse.json({ ok: true, providerMessageId: r.providerMessageId });
  }
  return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
}
