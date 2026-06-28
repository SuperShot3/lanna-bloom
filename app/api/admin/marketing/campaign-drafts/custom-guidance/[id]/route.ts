import { NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import { deleteCustomGuidanceLibraryItem } from '@/lib/marketing/campaignBuilder/guidanceLibrary';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const deleted = await deleteCustomGuidanceLibraryItem(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Custom guidance item not found or could not be deleted' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
