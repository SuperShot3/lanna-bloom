import { NextResponse } from 'next/server';
import { requireMarketingView } from '@/lib/marketing/adminApi';
import { getMarketingConfigStatus } from '@/lib/marketing/config';

export async function GET() {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  return NextResponse.json({ config: getMarketingConfigStatus() });
}
