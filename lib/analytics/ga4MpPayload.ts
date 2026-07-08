import { createHash, randomUUID } from 'crypto';
import type { AnalyticsItem } from '@/lib/analytics';

/** Prefer paid_at within this window for timestamp_micros; older clocks fall back to now. */
const PAID_AT_MAX_AGE_MS = 72 * 60 * 60 * 1000;

export interface Ga4MpPurchaseInput {
  transactionId: string;
  value: number;
  currency: string;
  items: AnalyticsItem[];
  clientId?: string | null;
  sessionId?: string | null;
  /** Order paid_at — preferred source for timestamp_micros when within 72h. */
  paidAt?: string | Date | number | null;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
}

export type Ga4MpPurchaseBody = {
  client_id: string;
  timestamp_micros?: number;
  user_data?: Record<string, string[]>;
  events: Array<{
    name: 'purchase';
    params: Record<string, unknown>;
  }>;
};

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
 * Coerce GA4 session_id to a 64-bit integer. Omit alphanumeric / empty values —
 * sending a string is silently rejected by GA4.
 */
export function coerceGa4SessionId(raw?: string | null): number | undefined {
  if (raw == null) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n) || n <= 0) return undefined;
  return n;
}

/**
 * Prefer order paid_at when within 72h; otherwise use now. Skip unparseable / future clocks
 * beyond a small skew by clamping to now.
 */
export function resolveTimestampMicros(
  paidAt: string | Date | number | null | undefined,
  nowMs: number = Date.now(),
): number {
  let paidMs: number | null = null;
  if (paidAt instanceof Date) {
    paidMs = paidAt.getTime();
  } else if (typeof paidAt === 'number' && Number.isFinite(paidAt)) {
    paidMs = paidAt > 1e14 ? Math.floor(paidAt / 1000) : Math.floor(paidAt);
  } else if (typeof paidAt === 'string' && paidAt.trim()) {
    const parsed = new Date(paidAt.trim()).getTime();
    if (Number.isFinite(parsed)) paidMs = parsed;
  }

  if (paidMs == null || !Number.isFinite(paidMs)) {
    return nowMs * 1000;
  }

  if (paidMs > nowMs + 60_000) {
    return nowMs * 1000;
  }

  if (nowMs - paidMs > PAID_AT_MAX_AGE_MS) {
    return nowMs * 1000;
  }

  return Math.floor(paidMs * 1000);
}

export function getGa4MpEndpointHost(): string {
  const override = process.env.GA4_MP_ENDPOINT_HOST?.trim();
  if (override) {
    return override.replace(/\/+$/, '');
  }
  // Default non-www host. GA4_MP_EU_ENDPOINT=true selects the same host (EU guidance).
  const eu = process.env.GA4_MP_EU_ENDPOINT?.trim().toLowerCase();
  if (eu === 'true' || eu === '1' || eu === 'on') {
    return 'https://google-analytics.com';
  }
  return 'https://google-analytics.com';
}

/**
 * Build the MP purchase JSON body (pure; used by sender + unit tests).
 * `processStartMs` is captured at sender entry; engagement_time_msec is elapsed at build time.
 */
export function buildGa4MpPurchaseBody(
  input: Ga4MpPurchaseInput,
  options: { processStartMs: number; nowMs?: number },
): { body: Ga4MpPurchaseBody; clientIdUsed: string } | { error: string; retryable: boolean } {
  const transactionId = input.transactionId.trim();
  const value = input.value;
  const currency = (input.currency ?? 'THB').trim() || 'THB';

  if (!transactionId || !Number.isFinite(value) || value <= 0) {
    return { error: 'Invalid purchase payload', retryable: false };
  }

  const clientIdUsed = resolveClientId(input.clientId);
  const items = buildMpItems(input.items);
  if (items.length === 0) {
    return { error: 'Purchase items are empty', retryable: false };
  }

  const nowMs = options.nowMs ?? Date.now();
  const engagementTimeMsec = Math.max(1, nowMs - options.processStartMs);

  const params: Record<string, unknown> = {
    transaction_id: transactionId,
    value,
    currency,
    items,
    engagement_time_msec: engagementTimeMsec,
  };

  const sessionId = coerceGa4SessionId(input.sessionId);
  if (sessionId != null) params.session_id = sessionId;

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

  const body: Ga4MpPurchaseBody = {
    client_id: clientIdUsed,
    timestamp_micros: resolveTimestampMicros(input.paidAt, nowMs),
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

  return { body, clientIdUsed };
}
