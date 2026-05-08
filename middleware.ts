import { auth } from '@/auth';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith('/admin');
  const isStudio = pathname.startsWith('/studio');
  if (!isAdmin && !isStudio) return;

  if (isAdmin) {
    const isPublic =
      pathname === '/admin' ||
      pathname === '/admin/login' ||
      pathname.startsWith('/admin/login/');
    if (isPublic) return;
  }

  if (!req.auth?.user) {
    const login = new URL('/admin/login', req.url);
    return Response.redirect(login);
  }
});

export const config = {
  matcher: ['/admin', '/admin/:path*', '/studio', '/studio/:path*'],
};
