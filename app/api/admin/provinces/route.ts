import { NextRequest, NextResponse } from 'next/server';
import { requireRole, canManageProvinces } from '@/lib/adminRbac';
import { listProvinces } from '@/lib/provinces/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const role = (authResult.session.user as { role?: string }).role;
  if (!canManageProvinces(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get('status') ?? undefined;
  const result = await listProvinces({ status });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ provinces: result.provinces });
}
