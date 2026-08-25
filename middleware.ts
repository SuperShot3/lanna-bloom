import { auth } from '@/auth';
import { applyAttributionCookies } from '@/lib/attribution/middlewareCapture';
import { applyHomepageExperiment } from '@/lib/homepageExperiment/middleware';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin')) {
    const isPublic =
      pathname === '/admin' ||
      pathname === '/admin/login' ||
      pathname.startsWith('/admin/login/');
    if (isPublic) return;
    if (!req.auth?.user) {
      const login = new URL('/admin/login', req.url);
      return Response.redirect(login);
    }
    return;
  }

  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return;
  }

  const attrRes = applyAttributionCookies(req);
  return applyHomepageExperiment(req, attrRes) ?? attrRes;
});

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/en',
    '/en/',
    '/en/homepage-v2',
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'gclid' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'gbraid' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'wbraid' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'utm_source' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'utm_medium' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'utm_campaign' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'campaignid' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'gad_campaignid' }],
    },
  ],
};
