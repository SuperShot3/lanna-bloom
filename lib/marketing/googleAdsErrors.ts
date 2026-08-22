export const GOOGLE_ADS_INVALID_GRANT_CODE = 'GOOGLE_ADS_INVALID_GRANT';

export interface GoogleAdsApiErrorView {
  message: string;
  code: string;
  hint?: string;
  status: number;
  canReconnect: boolean;
}

const LIBRARY_PARSER_BUG =
  /cannot read propert(?:y|ies) of undefined \(reading ['"](?:get|details)['"]\)/i;

function pushUnique(parts: string[], value: string) {
  const trimmed = value.trim();
  if (!trimmed || parts.includes(trimmed)) return;
  parts.push(trimmed);
}

function collectFromUnknown(value: unknown, parts: string[], depth: number) {
  if (value == null || depth > 4) return;
  if (typeof value === 'string') {
    pushUnique(parts, value);
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return;
  if (value instanceof Error) {
    pushUnique(parts, value.message);
    collectFromUnknown((value as Error & { cause?: unknown }).cause, parts, depth + 1);
    collectFromUnknown((value as Error & { response?: unknown }).response, parts, depth + 1);
    collectFromUnknown((value as Error & { error?: unknown }).error, parts, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    for (const key of ['error', 'error_description', 'message', 'status', 'data', 'details']) {
      if (key in rec) collectFromUnknown(rec[key], parts, depth + 1);
    }
    if ('response' in rec) collectFromUnknown(rec.response, parts, depth + 1);
  }
}

function collectErrorText(error: unknown): string {
  const parts: string[] = [];
  collectFromUnknown(error, parts, 0);
  return parts.join(' ');
}

export function isGoogleAdsInvalidGrant(error: unknown): boolean {
  return /invalid_grant/i.test(collectErrorText(error));
}

export function isGoogleAdsLibraryParserBug(error: unknown): boolean {
  return LIBRARY_PARSER_BUG.test(collectErrorText(error));
}

export function formatGoogleAdsApiError(error: unknown): GoogleAdsApiErrorView {
  if (isGoogleAdsInvalidGrant(error) || isGoogleAdsLibraryParserBug(error)) {
    return {
      message:
        'Google Ads access expired (invalid_grant). Reconnect Google Ads to create a new refresh token.',
      code: GOOGLE_ADS_INVALID_GRANT_CODE,
      hint: 'The Google Ads library hid the real OAuth error as “Cannot read properties of undefined (reading get)”. That almost always means the refresh token is expired or revoked. Reconnect, then set the OAuth consent screen to In production so it does not expire again in 7 days.',
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
