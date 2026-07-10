import { NextRequest } from 'next/server';

export const NO_STORE = { 'Cache-Control': 'no-store' } as const;
export const PUBLIC_CACHE = { 'Cache-Control': 'public, s-maxage=60' } as const;

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export function bodyHasHoneypot(body: Record<string, unknown>): boolean {
  const fields = ['company', 'website', 'url', 'phone_extra'] as const;
  for (const field of fields) {
    const val = body[field];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return true;
    }
  }
  return false;
}
