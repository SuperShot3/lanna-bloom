import { NextResponse } from 'next/server';
import { AHREFS_ANALYTICS_UPSTREAM_SRC } from '@/lib/analytics/ahrefs';

/** Refresh the edge/data cache daily; browsers still keep a 30-day copy. */
export const revalidate = 86400;

export async function GET() {
  try {
    const upstream = await fetch(AHREFS_ANALYTICS_UPSTREAM_SRC, {
      next: { revalidate: 86400 },
      headers: {
        Accept: 'text/javascript, application/javascript, */*',
      },
    });

    if (!upstream.ok) {
      return new NextResponse('/* ahrefs analytics unavailable */\n', {
        status: 502,
        headers: {
          'Content-Type': 'text/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    const body = await upstream.text();
    if (!body.includes('AhrefsAnalytics')) {
      return new NextResponse('/* ahrefs analytics unexpected payload */\n', {
        status: 502,
        headers: {
          'Content-Type': 'text/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control':
          'public, max-age=2592000, s-maxage=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[vendor/ahrefs-analytics] proxy failed:', err);
    return new NextResponse('/* ahrefs analytics unavailable */\n', {
      status: 502,
      headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
}
