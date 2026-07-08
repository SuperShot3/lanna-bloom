import 'server-only';

import { createHash } from 'crypto';
import { GoogleAdsApi, services } from 'google-ads-api';
import { getOrderById } from '@/lib/orders';
import {
  type OrderLikeForPurchase,
  purchaseValueAndCurrencyFromOrder,
} from '@/lib/analytics/buildPurchaseItemsFromOrder';
import { getGoogleAdsConfig, isGoogleAdsConfigured } from '@/lib/marketing/config';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isSupabaseMissingColumnError } from '@/lib/supabase/columnErrors';

const DEFAULT_FALLBACK_DELAY_MS = 90_000;
const DEFAULT_CLAIMED_GRACE_MS = 300_000;
const MAX_UPLOAD_ATTEMPTS = 5;
const RETRY_BACKOFF_MS = [120_000, 300_000, 600_000, 1_800_000, 3_600_000];

function readFallbackDelayMs(): number {
  const raw = process.env.GA4_PURCHASE_FALLBACK_DELAY_MS?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_FALLBACK_DELAY_MS;
}

function readClaimedGraceMs(): number {
  const raw = process.env.GA4_PURCHASE_CLAIMED_GRACE_MS?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_CLAIMED_GRACE_MS;
}

export function getGoogleAdsPurchaseConversionAction(): string | null {
  const raw = process.env.GOOGLE_ADS_PURCHASE_CONVERSION_ACTION?.trim();
  if (!raw) return null;
  if (!/^customers\/\d+\/conversionActions\/\d+$/.test(raw)) return null;
  return raw;
}

export function isGoogleAdsConversionUploadConfigured(): boolean {
  return isGoogleAdsConfigured() && getGoogleAdsPurchaseConversionAction() != null;
}

type AdsUploadOrderRow = {
  order_id: string;
  payment_status: string | null;
  paid_at: string | null;
  google_ads_conversion_sent: boolean | null;
  google_ads_conversion_attempts: number | null;
  ga4_purchase_claimed?: boolean | null;
  ga4_purchase_claimed_at?: string | null;
  ga4_purchase_fallback_run_after: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  customer_email: string | null;
  phone: string | null;
  phone_country_code: string | null;
  order_json: Record<string, unknown> | null;
  grand_total?: number | null;
  currency?: string | null;
};

const ADS_ROW_SELECT =
  'order_id, payment_status, paid_at, google_ads_conversion_sent, google_ads_conversion_attempts, ga4_purchase_claimed, ga4_purchase_claimed_at, ga4_purchase_fallback_run_after, gclid, gbraid, wbraid, customer_email, phone, phone_country_code, order_json, grand_total, currency';

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

function isOrderPaid(row: Pick<AdsUploadOrderRow, 'payment_status' | 'paid_at'>): boolean {
  return (
    (row.payment_status ?? '').toUpperCase() === 'PAID' || Boolean(row.paid_at)
  );
}

function claimedGraceNotElapsed(
  row: Pick<AdsUploadOrderRow, 'ga4_purchase_claimed' | 'ga4_purchase_claimed_at'>,
): boolean {
  if (row.ga4_purchase_claimed !== true) return false;
  const claimedAtMs = row.ga4_purchase_claimed_at
    ? new Date(row.ga4_purchase_claimed_at).getTime()
    : null;
  if (claimedAtMs == null || !Number.isFinite(claimedAtMs)) return false;
  return Date.now() < claimedAtMs + readClaimedGraceMs();
}

function orderLikeFromRow(
  row: Pick<AdsUploadOrderRow, 'order_json' | 'grand_total' | 'currency'>,
): OrderLikeForPurchase | null {
  const json = row.order_json;
  if (json && typeof json === 'object') {
    return json as unknown as OrderLikeForPurchase;
  }
  const total = Number(row.grand_total ?? 0);
  if (Number.isFinite(total) && total > 0) {
    return {
      pricing: { grandTotal: total },
      currency: (row.currency ?? 'THB') || 'THB',
      items: [],
    };
  }
  return null;
}

function formatConversionDateTime(paidAtIso: string): string {
  const d = new Date(paidAtIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`;
}

function resolveSingleClickId(row: Pick<AdsUploadOrderRow, 'gclid' | 'gbraid' | 'wbraid'>): {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
} {
  const gclid = row.gclid?.trim();
  if (gclid) return { gclid };
  const gbraid = row.gbraid?.trim();
  if (gbraid) return { gbraid };
  const wbraid = row.wbraid?.trim();
  if (wbraid) return { wbraid };
  return {};
}

function buildUserIdentifiers(row: AdsUploadOrderRow): Array<{ hashed_email?: string; hashed_phone_number?: string }> {
  const identifiers: Array<{ hashed_email?: string; hashed_phone_number?: string }> = [];
  const email = row.customer_email?.trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    identifiers.push({ hashed_email: sha256Normalized(email) });
  }
  const phoneE164 = row.phone ? normalizePhoneE164(row.phone, row.phone_country_code) : undefined;
  if (phoneE164) {
    identifiers.push({ hashed_phone_number: sha256Normalized(phoneE164) });
  }
  return identifiers;
}

function hasAttribution(
  clickId: ReturnType<typeof resolveSingleClickId>,
  userIdentifiers: ReturnType<typeof buildUserIdentifiers>,
): boolean {
  return Boolean(clickId.gclid || clickId.gbraid || clickId.wbraid || userIdentifiers.length > 0);
}

function parsePartialFailureError(partialFailure: unknown): string | null {
  if (!partialFailure || typeof partialFailure !== 'object') return null;
  const status = partialFailure as { message?: string };
  if (status.message) return status.message;
  return 'Google Ads upload partial failure';
}

export type GoogleAdsConversionUploadResult =
  | { status: 'skipped'; reason: string }
  | { status: 'sent'; orderId: string }
  | { status: 'failed'; orderId: string; error: string; retryable: boolean };

async function loadOrderRow(orderId: string): Promise<AdsUploadOrderRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const full = await supabase
    .from('orders')
    .select(ADS_ROW_SELECT)
    .eq('order_id', orderId)
    .maybeSingle();

  if (!full.error && full.data) {
    return full.data as AdsUploadOrderRow;
  }

  if (isSupabaseMissingColumnError(full.error, 'google_ads_conversion_sent')) {
    return null;
  }

  return null;
}

async function incrementAttempt(orderId: string, attempts: number): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const now = new Date().toISOString();
  const nextAttempts = attempts + 1;

  const { data, error } = await supabase
    .from('orders')
    .update({
      google_ads_conversion_attempts: nextAttempts,
      google_ads_conversion_last_attempt_at: now,
      updated_at: now,
    })
    .eq('order_id', orderId)
    .or('google_ads_conversion_sent.is.null,google_ads_conversion_sent.eq.false')
    .select('order_id');

  if (error && isSupabaseMissingColumnError(error, 'google_ads_conversion_attempts')) {
    return true;
  }
  return Array.isArray(data) && data.length > 0;
}

async function markUploadSuccess(orderId: string): Promise<{ ok: boolean; alreadySentRace: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, alreadySentRace: false, error: 'supabase_unavailable' };
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('orders')
    .update({
      google_ads_conversion_sent: true,
      google_ads_conversion_sent_at: now,
      google_ads_conversion_source: 'upload_api',
      google_ads_conversion_last_error: null,
      updated_at: now,
    })
    .eq('order_id', orderId)
    .or('google_ads_conversion_sent.is.null,google_ads_conversion_sent.eq.false')
    .select('order_id');

  if (error) {
    if (isSupabaseMissingColumnError(error, 'google_ads_conversion_sent')) {
      return { ok: false, alreadySentRace: false, error: 'migration_pending' };
    }
    return { ok: false, alreadySentRace: false, error: error.message };
  }
  if (Array.isArray(data) && data.length > 0) {
    return { ok: true, alreadySentRace: false };
  }
  return { ok: false, alreadySentRace: true, error: 'already_sent_race' };
}

async function markUploadFailure(
  orderId: string,
  error: string,
  attempts: number,
  retryable: boolean,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const now = new Date().toISOString();
  const backoffIdx = Math.min(Math.max(attempts, 1) - 1, RETRY_BACKOFF_MS.length - 1);
  const runAfter =
    retryable && attempts < MAX_UPLOAD_ATTEMPTS
      ? new Date(Date.now() + RETRY_BACKOFF_MS[backoffIdx]).toISOString()
      : null;

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      google_ads_conversion_last_error: error.slice(0, 500),
      ...(runAfter ? { ga4_purchase_fallback_run_after: runAfter } : {}),
      updated_at: now,
    })
    .eq('order_id', orderId);

  if (updateError && !isSupabaseMissingColumnError(updateError, 'google_ads_conversion_last_error')) {
    console.error('[ads/conversion-upload] failed to persist failure metadata', {
      orderId,
      error: updateError.message,
    });
  }
}

async function sendClickConversionUpload(input: {
  conversionAction: string;
  orderId: string;
  value: number;
  currency: string;
  paidAt: string;
  clickId: ReturnType<typeof resolveSingleClickId>;
  userIdentifiers: ReturnType<typeof buildUserIdentifiers>;
}): Promise<{ ok: true } | { ok: false; error: string; retryable: boolean }> {
  const config = getGoogleAdsConfig();
  if (!config) {
    return { ok: false, error: 'Google Ads is not configured', retryable: false };
  }

  const client = new GoogleAdsApi({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    developer_token: config.developerToken,
  });

  const customer = client.Customer({
    customer_id: config.customerId,
    refresh_token: config.refreshToken,
    login_customer_id: config.loginCustomerId,
  });

  const conversion: services.IClickConversion = {
    conversion_action: input.conversionAction,
    conversion_date_time: formatConversionDateTime(input.paidAt),
    conversion_value: input.value,
    currency_code: input.currency,
    order_id: input.orderId,
    ...input.clickId,
    ...(input.userIdentifiers.length > 0 ? { user_identifiers: input.userIdentifiers } : {}),
  };

  try {
    const response = await customer.conversionUploads.uploadClickConversions({
      customer_id: config.customerId,
      conversions: [conversion],
      partial_failure: true,
    } as services.UploadClickConversionsRequest);

    const partialError = parsePartialFailureError(response.partial_failure_error);
    if (partialError) {
      const retryable = !/invalid|permission|not found|unknown/i.test(partialError);
      return { ok: false, error: partialError, retryable };
    }

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const retryable = !/invalid|permission|not found|authentication/i.test(message);
    return { ok: false, error: message, retryable };
  }
}

/**
 * Attempt Google Ads Conversion Upload for one order (server fallback).
 * Skips when browser already confirmed, delay not elapsed, or no attribution data.
 */
export async function tryProcessGoogleAdsConversionUpload(
  orderId: string,
): Promise<GoogleAdsConversionUploadResult> {
  const normalized = orderId.trim();
  if (!normalized) return { status: 'skipped', reason: 'invalid_order_id' };

  const conversionAction = getGoogleAdsPurchaseConversionAction();
  if (!conversionAction) {
    return { status: 'skipped', reason: 'ads_upload_not_configured' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { status: 'skipped', reason: 'supabase_unavailable' };

  const row = await loadOrderRow(normalized);
  if (!row) return { status: 'skipped', reason: 'order_not_found' };
  if (row.google_ads_conversion_sent === true) {
    return { status: 'skipped', reason: 'already_sent' };
  }
  if (!isOrderPaid(row)) return { status: 'skipped', reason: 'not_paid' };
  if (claimedGraceNotElapsed(row)) {
    return { status: 'skipped', reason: 'claimed_grace' };
  }

  const attempts = Number(row.google_ads_conversion_attempts ?? 0);
  if (attempts >= MAX_UPLOAD_ATTEMPTS) {
    return { status: 'skipped', reason: 'max_attempts' };
  }

  const runAfterRaw = row.ga4_purchase_fallback_run_after ?? null;
  const paidAtMs = row.paid_at ? new Date(row.paid_at).getTime() : null;
  const dueAtMs =
    runAfterRaw != null
      ? new Date(runAfterRaw).getTime()
      : paidAtMs != null
        ? paidAtMs + readFallbackDelayMs()
        : null;

  if (dueAtMs != null && Date.now() < dueAtMs) {
    return { status: 'skipped', reason: 'delay_not_elapsed' };
  }

  const clickId = resolveSingleClickId(row);
  const userIdentifiers = buildUserIdentifiers(row);
  if (!hasAttribution(clickId, userIdentifiers)) {
    return { status: 'skipped', reason: 'no_attribution' };
  }

  const acquired = await incrementAttempt(normalized, attempts);
  if (!acquired) {
    return { status: 'skipped', reason: 'attempt_not_acquired' };
  }
  const attemptNumber = attempts + 1;

  try {
    const order = await getOrderById(normalized);
    const orderForPurchase = order ?? orderLikeFromRow(row);
    if (!orderForPurchase) {
      await markUploadFailure(normalized, 'order_load_failed', attemptNumber, true);
      return { status: 'failed', orderId: normalized, error: 'order_load_failed', retryable: true };
    }

    const { value, currency } = purchaseValueAndCurrencyFromOrder(orderForPurchase);
    if (!Number.isFinite(value) || value <= 0) {
      await markUploadFailure(normalized, 'invalid_purchase_value', attemptNumber, false);
      return {
        status: 'failed',
        orderId: normalized,
        error: 'invalid_purchase_value',
        retryable: false,
      };
    }

    const paidAt = row.paid_at ?? new Date().toISOString();
    const result = await sendClickConversionUpload({
      conversionAction,
      orderId: normalized,
      value,
      currency,
      paidAt,
      clickId,
      userIdentifiers,
    });

    if (result.ok) {
      const marked = await markUploadSuccess(normalized);
      if (marked.ok) {
        console.info('[ads/conversion-upload] conversion uploaded', { orderId: normalized });
        return { status: 'sent', orderId: normalized };
      }
      if (marked.alreadySentRace) {
        return { status: 'skipped', reason: 'already_sent_race' };
      }
      await markUploadFailure(normalized, marked.error ?? 'mark_success_failed', attemptNumber, true);
      return {
        status: 'failed',
        orderId: normalized,
        error: marked.error ?? 'mark_success_failed',
        retryable: true,
      };
    }

    await markUploadFailure(normalized, result.error, attemptNumber, result.retryable);
    console.warn('[ads/conversion-upload] upload failed', {
      orderId: normalized,
      error: result.error,
      retryable: result.retryable,
      attempts: attemptNumber,
    });
    return {
      status: 'failed',
      orderId: normalized,
      error: result.error,
      retryable: result.retryable,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await markUploadFailure(normalized, message, attemptNumber, true);
    return { status: 'failed', orderId: normalized, error: message, retryable: true };
  }
}
