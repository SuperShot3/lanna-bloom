import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { loadKnownContacts } from '@/lib/rewards/knownContacts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const result = await loadKnownContacts();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ contacts: result.contacts });
}
