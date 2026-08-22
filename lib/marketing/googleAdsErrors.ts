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

const SECRET_KEY = /refresh.?token|access.?token|client_secret|developer.?token|authorization/i;

function pushUnique(parts: string[], value: string) {
  const trimmed = value.trim();
  if (!trimmed || parts.includes(trimmed)) return;
  parts.push(trimmed);
}

function collectFromUnknown(value: unknown, parts: string[], depth: number) {
  if (value == null || depth > 5) return;
  if (typeof value === 'string') {
    pushUnique(parts, value);
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    pushUnique(parts, String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 8)) collectFromUnknown(item, parts, depth + 1);
    return;
  }
  if (value instanceof Error) {
    if (value.message) pushUnique(parts, value.message);
    collectFromUnknown((value as Error & { cause?: unknown }).cause, parts, depth + 1);
    collectFromUnknown((value as Error & { response?: unknown }).response, parts, depth + 1);
    collectFromUnknown((value as Error & { error?: unknown }).error, parts, depth + 1);
    const extra = value as Error & { errors?: unknown };
    if (extra.errors) collectFromUnknown(extra.errors, parts, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.toJSON === 'function') {
      try {
        const jsoned = rec.toJSON();
        if (jsoned && jsoned !== rec) collectFromUnknown(jsoned, parts, depth + 1);
      } catch {
        /* ignore */
      }
    }
    for (const key of [
      'errors',
      'errorsList',
      'error',
      'error_description',
      'error_code',
      'errorCode',
      'authorization_error',
      'authorizationError',
      'message',
      'status',
      'data',
      'details',
      'reason',
    ]) {
      if (key in rec) collectFromUnknown(rec[key], parts, depth + 1);
    }
    if ('response' in rec) collectFromUnknown(rec.response, parts, depth + 1);

    if (parts.length === 0) {
      try {
        const json = JSON.stringify(value, (key, nested) =>
          SECRET_KEY.test(key) ? '[redacted]' : nested,
        );
        if (json && json !== '{}' && json !== '[]' && json !== 'null') {
          pushUnique(parts, json.length > 800 ? `${json.slice(0, 800)}…` : json);
        }
      } catch {
        /* circular */
      }
    }
  }
}

export function collectGoogleAdsErrorText(error: unknown): string {
  const parts: string[] = [];
  collectFromUnknown(error, parts, 0);
  return parts.join(' ').trim();
}

export function isGoogleAdsInvalidGrant(error: unknown): boolean {
  return /invalid_grant/i.test(collectGoogleAdsErrorText(error));
}

export function isGoogleAdsLibraryParserBug(error: unknown): boolean {
  return LIBRARY_PARSER_BUG.test(collectGoogleAdsErrorText(error));
}

export function debugGoogleAdsError(error: unknown): Record<string, unknown> {
  if (error == null) return { type: String(error) };
  if (typeof error !== 'object') return { type: typeof error, value: String(error) };
  const ctor = (error as { constructor?: { name?: string } }).constructor?.name ?? 'object';
  const keys = Object.getOwnPropertyNames(error).slice(0, 20);
  return { constructor: ctor, keys };
}

export function formatGoogleAdsApiError(error: unknown): GoogleAdsApiErrorView {
  const text = collectGoogleAdsErrorText(error);

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

  if (/USER_PERMISSION_DENIED|NOT_ADS_USER|CUSTOMER_NOT_FOUND|AUTHORIZATION/i.test(text)) {
    return {
      message: text,
      code: 'GOOGLE_ADS_PERMISSION',
      hint: 'OAuth worked, but this Google account cannot read the Ads customer. Check GOOGLE_ADS_CUSTOMER_ID (the account with campaigns) and GOOGLE_ADS_LOGIN_CUSTOMER_ID (the MCC manager id, no dashes). Then reconnect with the Google user that owns the manager account.',
      status: 502,
      canReconnect: true,
    };
  }

  if (/DEVELOPER_TOKEN/i.test(text)) {
    return {
      message: text,
      code: 'GOOGLE_ADS_DEVELOPER_TOKEN',
      hint: 'The developer token is missing access for this Ads account. In Google Ads → API Center, confirm the token is approved (or that this is a test account allowed under test access).',
      status: 502,
      canReconnect: false,
    };
  }

  return {
    message: text || 'Failed to fetch Google Ads data',
    code: 'GOOGLE_ADS_API_ERROR',
    status: 502,
    canReconnect: false,
  };
}
