'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ADMIN_COOKIE = 'admin-v2-secret';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function setAdminSecret(formData: FormData) {
  const secret = formData.get('secret')?.toString()?.trim();
  const expected = process.env.ORDERS_ADMIN_SECRET;
  if (!expected || !secret || secret !== expected) {
    redirect('/admin-v2?error=invalid');
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin-v2',
    maxAge: COOKIE_MAX_AGE,
  });
  redirect('/admin-v2/orders');
}

export async function getAdminSecret(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_COOKIE);
  const secret = cookie?.value;
  const expected = process.env.ORDERS_ADMIN_SECRET;
  if (!expected || !secret || secret !== expected) return null;
  return secret;
}

export async function clearAdminSecret() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect('/admin-v2');
}
