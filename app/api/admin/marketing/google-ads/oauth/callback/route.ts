import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import {
  GOOGLE_ADS_OAUTH_STATE_COOKIE,
  exchangeGoogleAdsAuthorizationCode,
  googleAdsOAuthErrorPath,
  googleAdsOAuthSuccessPath,
  parseGoogleAdsOAuthReturnTo,
  verifyGoogleAdsOAuthState,
} from '@/lib/marketing/googleAdsOAuth';
import { saveStoredGoogleAdsOAuth } from '@/lib/marketing/googleAdsOAuthStore';

function redirectTo(path: string, request: NextRequest) {
  const response = NextResponse.redirect(new URL(path, request.nextUrl.origin));
  response.cookies.set(GOOGLE_ADS_OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const returnToHint = parseGoogleAdsOAuthReturnTo(request.nextUrl.searchParams.get('state')?.split('.')[2]);

  const auth = await requireMarketingApply();
  if (!auth.ok) {
    return redirectTo('/admin/login', request);
  }

  const oauthError = request.nextUrl.searchParams.get('error');
  if (oauthError) {
    return redirectTo(googleAdsOAuthErrorPath(returnToHint, oauthError), request);
  }

  const verified = verifyGoogleAdsOAuthState(
    request.nextUrl.searchParams.get('state'),
    request.cookies.get(GOOGLE_ADS_OAUTH_STATE_COOKIE)?.value,
  );
  if (!verified.ok) {
    return redirectTo(googleAdsOAuthErrorPath(returnToHint, 'invalid_state'), request);
  }

  const code = request.nextUrl.searchParams.get('code')?.trim();
  if (!code) {
    return redirectTo(googleAdsOAuthErrorPath(verified.returnTo, 'missing_code'), request);
  }

  try {
    const refreshToken = await exchangeGoogleAdsAuthorizationCode(code);
    await saveStoredGoogleAdsOAuth({
      refreshToken,
      connectedByEmail: auth.session.user.email ?? null,
    });
    return redirectTo(googleAdsOAuthSuccessPath(verified.returnTo), request);
  } catch (error) {
    const reason =
      error instanceof Error && /migration/i.test(error.message)
        ? 'storage_missing'
        : 'token_exchange_failed';
    return redirectTo(googleAdsOAuthErrorPath(verified.returnTo, reason), request);
  }
}
