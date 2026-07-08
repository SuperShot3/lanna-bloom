import 'server-only';

import {
  buildGa4MpPurchaseBody,
  getGa4MpEndpointHost,
  type Ga4MpPurchaseBody,
  type Ga4MpPurchaseInput,
} from '@/lib/analytics/ga4MpPayload';

export {
  buildGa4MpPurchaseBody,
  coerceGa4SessionId,
  getGa4MpEndpointHost,
  resolveTimestampMicros,
  type Ga4MpPurchaseBody,
  type Ga4MpPurchaseInput,
} from '@/lib/analytics/ga4MpPayload';

export interface Ga4MpConfig {
  measurementId: string;
  apiSecret: string;
}

export function getGa4MeasurementProtocolConfig(): Ga4MpConfig | null {
  const measurementId = process.env.GA4_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_MEASUREMENT_API_SECRET?.trim();
  if (!measurementId || !apiSecret) return null;
  if (!/^G-[A-Z0-9]+$/i.test(measurementId)) return null;
  return { measurementId, apiSecret };
}

export function isGa4MeasurementProtocolConfigured(): boolean {
  return getGa4MeasurementProtocolConfig() != null;
}

export type Ga4MpSendResult =
  | { ok: true; clientIdUsed: string }
  | { ok: false; error: string; retryable: boolean };

export function shouldUseGa4MpDebugPipeline(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv && vercelEnv !== 'production') return true;
  return false;
}

/** Default on for first ship — validate payload via debug collect before production /mp/collect. */
export function shouldValidateGa4MpBeforeSend(): boolean {
  const raw = process.env.GA4_MP_VALIDATE_BEFORE_SEND?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'off') return false;
  if (raw === 'true' || raw === '1' || raw === 'on') return true;
  return true;
}

type DebugCollectResponse = {
  validationMessages?: Array<{ description?: string; fieldPath?: string; validationCode?: string }>;
};

function serializeValidationMessages(messages: NonNullable<DebugCollectResponse['validationMessages']>): string {
  return messages
    .map((m) => {
      const parts = [m.validationCode, m.fieldPath, m.description].filter(Boolean);
      return parts.join(': ') || JSON.stringify(m);
    })
    .join('; ')
    .slice(0, 500);
}

function mpCollectUrl(path: '/mp/collect' | '/debug/mp/collect', config: Ga4MpConfig): URL {
  const host = getGa4MpEndpointHost();
  const url = new URL(`${host}${path}`);
  url.searchParams.set('measurement_id', config.measurementId);
  url.searchParams.set('api_secret', config.apiSecret);
  return url;
}

async function postMpJson(
  url: URL,
  body: Ga4MpPurchaseBody,
): Promise<{ ok: boolean; status: number; text: string; json: unknown | null }> {
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text().catch(() => '');
  let json: unknown | null = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = null;
    }
  }
  return { ok: res.ok, status: res.status, text, json };
}

async function validateViaDebugCollect(
  config: Ga4MpConfig,
  body: Ga4MpPurchaseBody,
): Promise<Ga4MpSendResult | { ok: true }> {
  const url = mpCollectUrl('/debug/mp/collect', config);
  try {
    const res = await postMpJson(url, body);
    if (!res.ok) {
      return {
        ok: false,
        error: `GA4 MP debug HTTP ${res.status}${res.text ? `: ${res.text.slice(0, 200)}` : ''}`,
        retryable: res.status >= 500 || res.status === 429,
      };
    }
    const parsed = (res.json ?? {}) as DebugCollectResponse;
    const messages = Array.isArray(parsed.validationMessages) ? parsed.validationMessages : [];
    if (messages.length > 0) {
      return {
        ok: false,
        error: `GA4 MP validation: ${serializeValidationMessages(messages)}`,
        retryable: false,
      };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `GA4 MP debug: ${message}`, retryable: true };
  }
}

/**
 * Send GA4 `purchase` via Measurement Protocol (server-side fallback).
 *
 * - Non-production: POST only to `/debug/mp/collect`; fail on validationMessages.
 * - Production: optionally validate via debug first (`GA4_MP_VALIDATE_BEFORE_SEND`, default on),
 *   then POST to `/mp/collect`.
 */
export async function sendGa4MeasurementProtocolPurchase(
  input: Ga4MpPurchaseInput,
): Promise<Ga4MpSendResult> {
  const processStartMs = Date.now();
  const config = getGa4MeasurementProtocolConfig();
  if (!config) {
    return { ok: false, error: 'GA4 Measurement Protocol is not configured', retryable: false };
  }

  const built = buildGa4MpPurchaseBody(input, { processStartMs });
  if ('error' in built) {
    return { ok: false, error: built.error, retryable: built.retryable };
  }

  const { body, clientIdUsed } = built;
  const debugOnly = shouldUseGa4MpDebugPipeline();

  try {
    if (debugOnly) {
      const validated = await validateViaDebugCollect(config, body);
      if (!validated.ok) return validated;
      return { ok: true, clientIdUsed };
    }

    if (shouldValidateGa4MpBeforeSend()) {
      const validated = await validateViaDebugCollect(config, body);
      if (!validated.ok) return validated;
    }

    const url = mpCollectUrl('/mp/collect', config);
    const res = await postMpJson(url, body);

    if (res.ok) {
      return { ok: true, clientIdUsed };
    }

    const retryable = res.status >= 500 || res.status === 429;
    return {
      ok: false,
      error: `GA4 MP HTTP ${res.status}${res.text ? `: ${res.text.slice(0, 200)}` : ''}`,
      retryable,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, retryable: true };
  }
}
