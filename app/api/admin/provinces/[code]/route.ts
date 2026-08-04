import { NextRequest, NextResponse } from 'next/server';
import { requireRole, canManageProvinces } from '@/lib/adminRbac';
import { getProvinceByCode, updateProvince } from '@/lib/provinces/queries';
import { validateProvinceUpdate } from '@/lib/provinces/validate';

export const dynamic = 'force-dynamic';

const CODE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseCode(raw: string): string | null {
  const code = raw.trim().toLowerCase();
  if (!CODE_RE.test(code) || code.length > 80) return null;
  return code;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const role = (authResult.session.user as { role?: string }).role;
  if (!canManageProvinces(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const code = parseCode((await params).code);
  if (!code) {
    return NextResponse.json({ error: 'Invalid province code' }, { status: 400 });
  }

  const result = await getProvinceByCode(code);
  if (!result.ok) {
    if (result.error === 'Not found') {
      return NextResponse.json({ error: 'Province not found' }, { status: 404 });
    }
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ province: result.province });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const role = (authResult.session.user as { role?: string }).role;
  if (!canManageProvinces(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const code = parseCode((await params).code);
  if (!code) {
    return NextResponse.json({ error: 'Invalid province code' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const existing = await getProvinceByCode(code);
  if (!existing.ok) {
    if (existing.error === 'Not found') {
      return NextResponse.json({ error: 'Province not found' }, { status: 404 });
    }
    return NextResponse.json({ error: existing.error }, { status: 500 });
  }

  const validated = validateProvinceUpdate(body, {
    status: existing.province.status,
    catalog_enabled: existing.province.catalog_enabled,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const result = await updateProvince(code, validated.patch);
  if (!result.ok) {
    if (result.error === 'Not found') {
      return NextResponse.json({ error: 'Province not found' }, { status: 404 });
    }
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ province: result.province });
}
