import { auth } from '@/auth';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/admin')) return;

  const isPublic =
    pathname === '/admin' ||
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/login/');
  if (isPublic) return;

  if (!req.auth?.user) {
    const login = new URL('/admin/login', req.url);
    return Response.redirect(login);
  }
});

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
