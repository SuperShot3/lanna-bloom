import 'server-only';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export type AdminRole = 'OWNER' | 'MANAGER' | 'SUPPORT';

export function canEditCosts(role: string | undefined): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

export function canRefund(role: string | undefined): boolean {
  return role === 'OWNER';
}

export function canManageAdmins(role: string | undefined): boolean {
  return role === 'OWNER';
}

export function canChangeStatus(role: string | undefined): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

export function canAssignDriver(role: string | undefined): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

export function canUploadDeliveryProof(role: string | undefined): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

export type AuthResult =
  | { ok: true; session: { user: { email?: string | null; role?: string } } }
  | { ok: false; response: NextResponse };

/**
 * Require authenticated session. Returns error response if not authenticated.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true, session };
}

/**
 * Require authenticated session with one of the allowed roles. Returns error response if not authenticated or role not allowed.
 */
export async function requireRole(allowedRoles: AdminRole[]): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.ok) return result;
  const role = (result.session.user as { role?: string }).role;
  if (!role || !allowedRoles.includes(role as AdminRole)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}
