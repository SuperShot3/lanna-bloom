import { NextResponse } from 'next/server';
import { canApplyMarketingAds, canViewMarketing, requireAuth, type AuthResult } from '@/lib/adminRbac';

export async function requireMarketingView(): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.ok) return result;
  const role = (result.session.user as { role?: string }).role;
  if (!canViewMarketing(role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}

export async function requireMarketingApply(): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.ok) return result;
  const role = (result.session.user as { role?: string }).role;
  if (!canApplyMarketingAds(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Only owners can approve or apply Google Ads changes.' },
        { status: 403 },
      ),
    };
  }
  return result;
}

export function parseDaysParam(value: string | null, fallback = 14): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(90, Math.max(1, Math.floor(n)));
}
