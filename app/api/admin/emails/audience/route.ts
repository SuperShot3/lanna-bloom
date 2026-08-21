import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { loadMarketingAudience } from '@/lib/email/loadMarketingAudience';

export async function GET() {
  const auth = await requireRole(['OWNER', 'MANAGER', 'SUPPORT']);
  if (!auth.ok) return auth.response;
  const result = await loadMarketingAudience();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ items: result.items });
}
