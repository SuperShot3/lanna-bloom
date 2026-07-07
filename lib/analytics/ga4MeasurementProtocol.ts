import 'server-only';

import { createHash, randomUUID } from 'crypto';
import type { AnalyticsItem } from '@/lib/analytics';

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

function sha256Normalized(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function normalizePhoneE164(phone: string, countryCode?: string | null): string | undefined {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('66') && digits.length >= 10) return `+${digits}`;
  const cc = countryCode?.replace(/\D/g, '') ?? '66';
  if (cc === '66' && digits.length === 9) return `+66${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  return `+${cc}${digits}`;
}

export interface Ga4MpPurchaseInput {
  transactionId: string;
  value: number;
  currency: string;
  items: AnalyticsItem[];
  clientId?: string | null;
  sessionId?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
}

export type Ga4MpSendResult =
  | { ok: true; clientIdUsed: string }
  | { ok: false; error: string; retryable: boolean };

function buildMpItems(items: AnalyticsItem[]) {
  return items.map((item, index) => ({
    item_id: item.item_id,
    item_name: item.item_name,
    price: item.price,
    quantity: item.quantity ?? 1,
    index: item.index ?? index,
    ...(item.item_category ? { item_category: item.item_category } : {}),
    ...(item.item_variant ? { item_variant: item.item_variant } : {}),
  }));
}

function resolveClientId(input?: string | null): string {
  const trimmed = input?.trim();
  if (trimmed && /^\d+\.\d+$/.test(trimmed)) return trimmed;
  return `${Date.now()}.${randomUUID().replace(/-/g, '').slice(0, 10)}`;
}

/**
 * Send GA4 `purchase` via Measurement Protocol (server-side fallback).
 * Marks success only when HTTP response is 2xx.
 */
export async function sendGa4MeasurementProtocolPurchase(
  input: Ga4MpPurchaseInput,
): Promise<Ga4MpSendResult> {
  const config = getGa4MeasurementProtocolConfig();
  if (!config) {
    return { ok: false, error: 'GA4 Measurement Protocol is not configured', retryable: false };
  }

  const transactionId = input.transactionId.trim();
  const value = input.value;
  const currency = (input.currency ?? 'THB').trim() || 'THB';

  if (!transactionId || !Number.isFinite(value) || value <= 0) {
    return { ok: false, error: 'Invalid purchase payload', retryable: false };
  }

  const clientIdUsed = resolveClientId(input.clientId);
  const items = buildMpItems(input.items);
  if (items.length === 0) {
    return { ok: false, error: 'Purchase items are empty', retryable: false };
  }

  const params: Record<string, unknown> = {
    transaction_id: transactionId,
    value,
    currency,
    items,
    engagement_time_msec: 1,
  };

  const sessionId = input.sessionId?.trim();
  if (sessionId) params.session_id = sessionId;

  const gclid = input.gclid?.trim();
  const gbraid = input.gbraid?.trim();
  const wbraid = input.wbraid?.trim();
  if (gclid) params.gclid = gclid;
  if (gbraid) params.gbraid = gbraid;
  if (wbraid) params.wbraid = wbraid;

  const userData: Record<string, string[]> = {};
  const email = input.email?.trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    userData.sha256_email_address = [sha256Normalized(email)];
  }
  const phoneE164 = input.phone ? normalizePhoneE164(input.phone, input.phoneCountryCode) : undefined;
  if (phoneE164) {
    userData.sha256_phone_number = [sha256Normalized(phoneE164)];
  }

  const body: Record<string, unknown> = {
    client_id: clientIdUsed,
    events: [
      {
        name: 'purchase',
        params,
      },
    ],
  };

  if (Object.keys(userData).length > 0) {
    body.user_data = userData;
  }

  const url = new URL('https://www.google-analytics.com/mp/collect');
  url.searchParams.set('measurement_id', config.measurementId);
  url.searchParams.set('api_secret', config.apiSecret);

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return { ok: true, clientIdUsed };
    }

    const text = await res.text().catch(() => '');
    const retryable = res.status >= 500 || res.status === 429;
    return {
      ok: false,
      error: `GA4 MP HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
      retryable,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, retryable: true };
  }
}
