import { NextResponse } from 'next/server';
import { requireMarketingView } from '@/lib/marketing/adminApi';
import { listRecommendations } from '@/lib/marketing/recommendations/store';

export async function GET() {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  const recommendations = await listRecommendations(100);
  return NextResponse.json({ recommendations });
}
