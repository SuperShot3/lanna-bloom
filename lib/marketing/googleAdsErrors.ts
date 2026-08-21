export const GOOGLE_ADS_INVALID_GRANT_CODE = 'GOOGLE_ADS_INVALID_GRANT';

export interface GoogleAdsApiErrorView {
  message: string;
  code: string;
  hint?: string;
  status: number;
  canReconnect: boolean;
}

function collectErrorText(error: unknown): string {
  if (error == null) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    const extra = error as Error & {
      response?: { data?: unknown };
      error?: unknown;
      errors?: unknown;
    };
    const parts = [error.message];
    if (extra.response?.data != null) {
      parts.push(
        typeof extra.response.data === 'string'
          ? extra.response.data
          : JSON.stringify(extra.response.data),
      );
    }
    if (extra.error != null) {
      parts.push(typeof extra.error === 'string' ? extra.error : JSON.stringify(extra.error));
    }
    return parts.join(' ');
  }
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export function isGoogleAdsInvalidGrant(error: unknown): boolean {
  return /invalid_grant/i.test(collectErrorText(error));
}

export function formatGoogleAdsApiError(error: unknown): GoogleAdsApiErrorView {
  if (isGoogleAdsInvalidGrant(error)) {
    return {
      message:
        'Google Ads access expired (invalid_grant). Reconnect Google Ads to create a new refresh token.',
      code: GOOGLE_ADS_INVALID_GRANT_CODE,
      hint: 'OAuth refresh tokens expire after 7 days while the Google Cloud OAuth app is in Testing. Reconnect, then set the consent screen to In production so it does not expire again.',
      status: 502,
      canReconnect: true,
    };
  }

  const text = collectErrorText(error).trim();
  return {
    message: text || 'Failed to fetch Google Ads data',
    code: 'GOOGLE_ADS_API_ERROR',
    status: 502,
    canReconnect: false,
  };
}
