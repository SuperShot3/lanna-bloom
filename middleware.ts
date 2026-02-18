import { auth } from '@/auth';

const ADMIN_V2_PUBLIC = ['/admin-v2', '/admin-v2/login'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/admin-v2')) return;

  const isPublic =
    pathname === '/admin-v2' ||
    pathname === '/admin-v2/login' ||
    pathname.startsWith('/admin-v2/login/');
  if (isPublic) return;

  if (!req.auth?.user) {
    const login = new URL('/admin-v2/login', req.url);
    return Response.redirect(login);
  }
});

export const config = {
  matcher: ['/admin-v2/:path*'],
};
