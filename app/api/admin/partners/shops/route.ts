import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { listCatalogPartnerShops } from '@/lib/admin/catalogPartnerShops';

export async function GET() {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const shops = await listCatalogPartnerShops();
  return NextResponse.json({ shops });
}
