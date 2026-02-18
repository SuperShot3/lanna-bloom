import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

const ADMIN_COOKIE = 'admin-v2-secret';

/**
 * Check if request is authorized (cookie from admin-v2 login or x-admin-secret header).
 */
export async function isAdminAuthorized(request?: NextRequest): Promise<boolean> {
  const expected = process.env.ORDERS_ADMIN_SECRET;
  if (!expected) return process.env.NODE_ENV === 'development';

  if (request) {
    const header =
      request.headers.get('x-admin-secret') ??
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (header === expected) return true;
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_COOKIE);
  return cookie?.value === expected;
}
