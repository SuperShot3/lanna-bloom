import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import { getGoogleAdsOAuthClient } from '@/lib/marketing/config';
import {
  GOOGLE_ADS_OAUTH_STATE_COOKIE,
  buildGoogleAdsAuthorizeUrl,
  createGoogleAdsOAuthState,
  parseGoogleAdsOAuthReturnTo,
} from '@/lib/marketing/googleAdsOAuth';

export async function GET(request: NextRequest) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  if (!getGoogleAdsOAuthClient()) {
    return NextResponse.json(
      {
        error: 'Google Ads OAuth client is not configured',
        hint: 'Set GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET.',
      },
      { status: 503 },
    );
  }

  const returnTo = parseGoogleAdsOAuthReturnTo(request.nextUrl.searchParams.get('returnTo'));
  const state = createGoogleAdsOAuthState(returnTo);
  const response = NextResponse.redirect(buildGoogleAdsAuthorizeUrl(state));
  response.cookies.set(GOOGLE_ADS_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return response;
}
