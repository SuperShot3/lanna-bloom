import 'server-only';

import { getOrderById } from '@/lib/orders';
import {
  type OrderLikeForPurchase,
  buildPurchaseAnalyticsItemsFromOrder,
  purchaseValueAndCurrencyFromOrder,
} from '@/lib/analytics/buildPurchaseItemsFromOrder';
import {
  isGa4MeasurementProtocolConfigured,
  sendGa4MeasurementProtocolPurchase,
} from '@/lib/analytics/ga4MeasurementProtocol';
import {
  isGoogleAdsConversionUploadConfigured,
  tryProcessGoogleAdsConversionUpload,
} from '@/lib/analytics/googleAdsConversionUpload';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isSupabaseMissingColumnError } from '@/lib/supabase/columnErrors';

const DEFAULT_FALLBACK_DELAY_MS = 90_000;
const DEFAULT_CLAIMED_GRACE_MS = 300_000;
const MAX_MP_ATTEMPTS = 5;
const MP_LOCK_STALE_MS = 5 * 60_000;
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

type FallbackOrderRow = {
  order_id: string;
  payment_status: string | null;
  paid_at: string | null;
  ga4_purchase_sent: boolean | null;
  ga4_purchase_claimed?: boolean | null;
  ga4_purchase_claimed_at?: string | null;
  ga4_purchase_fallback_run_after: string | null;
  ga4_purchase_attempts: number | null;
  ga4_purchase_mp_lock_at: string | null;
  ga4_purchase_last_attempt_at?: string | null;
  ga_client_id: string | null;
  ga_session_id: string | null;
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

function isOrderPaid(row: Pick<FallbackOrderRow, 'payment_status' | 'paid_at'>): boolean {
  return (
    (row.payment_status ?? '').toUpperCase() === 'PAID' || Boolean(row.paid_at)
  );
}

function orderLikeFromFallbackRow(row: Pick<FallbackOrderRow, 'order_json' | 'grand_total' | 'currency'>): OrderLikeForPurchase | null {
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

function claimedGraceNotElapsed(row: Pick<FallbackOrderRow, 'ga4_purchase_claimed' | 'ga4_purchase_claimed_at'>): boolean {
  if (row.ga4_purchase_claimed !== true) return false;
  const claimedAtMs = row.ga4_purchase_claimed_at
    ? new Date(row.ga4_purchase_claimed_at).getTime()
    : null;
  if (claimedAtMs == null || !Number.isFinite(claimedAtMs)) return false;
  return Date.now() < claimedAtMs + readClaimedGraceMs();
}

/** Schedule MP fallback window after payment (idempotent). */
export async function scheduleGa4PurchaseFallback(orderId: string): Promise<void> {
  const normalized = orderId.trim();
  if (!normalized) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: row, error } = await supabase
    .from('orders')
    .select('order_id, paid_at, ga4_purchase_sent, ga4_purchase_fallback_run_after')
    .eq('order_id', normalized)
    .maybeSingle();

  if (error) {
    if (isSupabaseMissingColumnError(error, 'ga4_purchase_fallback_run_after')) {
      return;
    }
    return;
  }
  if (!row) return;
  if (row.ga4_purchase_sent === true) return;
  if (row.ga4_purchase_fallback_run_after) return;

  const paidAt = row.paid_at ? new Date(row.paid_at).getTime() : Date.now();
  const runAfter = new Date(paidAt + readFallbackDelayMs()).toISOString();

  await supabase
    .from('orders')
    .update({
      ga4_purchase_fallback_run_after: runAfter,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', normalized)
    .or('ga4_purchase_sent.is.null,ga4_purchase_sent.eq.false')
    .is('ga4_purchase_fallback_run_after', null);
}

export type Ga4FallbackProcessResult =
  | { status: 'skipped'; reason: string }
  | { status: 'sent'; orderId: string }
  | { status: 'failed'; orderId: string; error: string; retryable: boolean };

const MP_ROW_SELECT =
  'order_id, payment_status, paid_at, ga4_purchase_sent, ga4_purchase_claimed, ga4_purchase_claimed_at, ga4_purchase_fallback_run_after, ga4_purchase_attempts, ga4_purchase_mp_lock_at, ga4_purchase_last_attempt_at, ga_client_id, ga_session_id, gclid, gbraid, wbraid, customer_email, phone, phone_country_code, order_json, grand_total, currency';

async function loadOrderRowForMp(orderId: string): Promise<FallbackOrderRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const full = await supabase
    .from('orders')
    .select(MP_ROW_SELECT)
    .eq('order_id', orderId)
    .maybeSingle();

  if (!full.error && full.data) {
    return full.data as FallbackOrderRow;
  }

  const basic = await supabase
    .from('orders')
    .select(
      'order_id, payment_status, paid_at, ga4_purchase_sent, ga_client_id, customer_email, phone, phone_country_code, order_json, grand_total, currency',
    )
    .eq('order_id', orderId)
    .maybeSingle();

  if (basic.error || !basic.data) return null;
  return basic.data as FallbackOrderRow;
}

/**
 * Atomically acquire MP lock and increment attempt counter.
 * Returns the locked row with the post-increment attempt count.
 */
async function acquireMpLock(orderId: string): Promise<FallbackOrderRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const staleBefore = new Date(Date.now() - MP_LOCK_STALE_MS).toISOString();
  const now = new Date().toISOString();

  const { data: current, error: readError } = await supabase
    .from('orders')
    .select('ga4_purchase_attempts')
    .eq('order_id', orderId)
    .or('ga4_purchase_sent.is.null,ga4_purchase_sent.eq.false')
    .or(`ga4_purchase_mp_lock_at.is.null,ga4_purchase_mp_lock_at.lt.${staleBefore}`)
    .maybeSingle();

  if (readError || !current) return null;

  const nextAttempts = Number(current.ga4_purchase_attempts ?? 0) + 1;
  if (nextAttempts > MAX_MP_ATTEMPTS) return null;

  const { data: locked, error } = await supabase
    .from('orders')
    .update({
      ga4_purchase_mp_lock_at: now,
      ga4_purchase_attempts: nextAttempts,
      ga4_purchase_last_attempt_at: now,
      updated_at: now,
    })
    .eq('order_id', orderId)
    .or('ga4_purchase_sent.is.null,ga4_purchase_sent.eq.false')
    .or(`ga4_purchase_mp_lock_at.is.null,ga4_purchase_mp_lock_at.lt.${staleBefore}`)
    .select(MP_ROW_SELECT);

  if (!error && locked?.length) {
    return locked[0] as FallbackOrderRow;
  }

  if (isSupabaseMissingColumnError(error, 'ga4_purchase_mp_lock_at')) {
    const row = await loadOrderRowForMp(orderId);
    if (!row || row.ga4_purchase_sent === true) return null;
    return row;
  }

  return null;
}

async function releaseMpLock(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase
    .from('orders')
    .update({ ga4_purchase_mp_lock_at: null, updated_at: new Date().toISOString() })
    .eq('order_id', orderId);
}

async function markMpSuccess(orderId: string): Promise<{ ok: boolean; alreadySentRace: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, alreadySentRace: false, error: 'supabase_unavailable' };
  const now = new Date().toISOString();
  const fullUpdate = {
    ga4_purchase_sent: true,
    ga4_purchase_sent_at: now,
    ga4_purchase_source: 'measurement_protocol',
    ga4_purchase_last_error: null,
    ga4_purchase_mp_lock_at: null,
    updated_at: now,
  };

  let result = await supabase
    .from('orders')
    .update(fullUpdate)
    .eq('order_id', orderId)
    .or('ga4_purchase_sent.is.null,ga4_purchase_sent.eq.false')
    .select('order_id');

  if (
    result.error &&
    (isSupabaseMissingColumnError(result.error, 'ga4_purchase_source') ||
      isSupabaseMissingColumnError(result.error, 'ga4_purchase_last_error') ||
      isSupabaseMissingColumnError(result.error, 'ga4_purchase_mp_lock_at'))
  ) {
    result = await supabase
      .from('orders')
      .update({
        ga4_purchase_sent: true,
        ga4_purchase_sent_at: now,
        updated_at: now,
      })
      .eq('order_id', orderId)
      .or('ga4_purchase_sent.is.null,ga4_purchase_sent.eq.false')
      .select('order_id');
  }

  if (result.error) {
    return { ok: false, alreadySentRace: false, error: result.error.message };
  }
  if (Array.isArray(result.data) && result.data.length > 0) {
    return { ok: true, alreadySentRace: false };
  }
  return { ok: false, alreadySentRace: true, error: 'already_sent_race' };
}

/** Persist MP failure metadata. Attempt count was already incremented on lock acquire. */
async function markMpFailure(orderId: string, error: string, attempts: number, retryable: boolean): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const now = new Date().toISOString();
  const backoffIdx = Math.min(Math.max(attempts, 1) - 1, RETRY_BACKOFF_MS.length - 1);
  const runAfter = retryable && attempts < MAX_MP_ATTEMPTS
    ? new Date(Date.now() + RETRY_BACKOFF_MS[backoffIdx]).toISOString()
    : null;

  const fullUpdate = {
    ga4_purchase_last_error: error.slice(0, 500),
    ga4_purchase_fallback_run_after: runAfter,
    updated_at: now,
  };

  const result = await supabase.from('orders').update(fullUpdate).eq('order_id', orderId);
  if (!result.error) return;

  if (
    isSupabaseMissingColumnError(result.error, 'ga4_purchase_last_error') ||
    isSupabaseMissingColumnError(result.error, 'ga4_purchase_fallback_run_after')
  ) {
    console.warn('[ga4/fallback] could not persist MP failure metadata — apply migration 20260708120000', {
      orderId,
      error: result.error.message,
    });
  } else {
    console.error('[ga4/fallback] failed to persist MP failure metadata', {
      orderId,
      error: result.error.message,
    });
  }
}

/**
 * Attempt GA4 Measurement Protocol purchase for one order.
 * No-op when browser already confirmed, delay not elapsed, or MP not configured.
 */
export async function tryProcessGa4PurchaseFallback(
  orderId: string,
): Promise<Ga4FallbackProcessResult> {
  const normalized = orderId.trim();
  if (!normalized) return { status: 'skipped', reason: 'invalid_order_id' };

  if (!isGa4MeasurementProtocolConfigured()) {
    return { status: 'skipped', reason: 'mp_not_configured' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { status: 'skipped', reason: 'supabase_unavailable' };

  let row: FallbackOrderRow | null = null;

  const fullSelect = await supabase
    .from('orders')
    .select(
      'order_id, payment_status, paid_at, ga4_purchase_sent, ga4_purchase_claimed, ga4_purchase_claimed_at, ga4_purchase_fallback_run_after, ga4_purchase_attempts, ga4_purchase_mp_lock_at',
    )
    .eq('order_id', normalized)
    .maybeSingle();

  if (!fullSelect.error && fullSelect.data) {
    row = fullSelect.data as FallbackOrderRow;
  } else if (
    isSupabaseMissingColumnError(fullSelect.error, 'ga4_purchase_fallback_run_after') ||
    isSupabaseMissingColumnError(fullSelect.error, 'ga4_purchase_attempts') ||
    isSupabaseMissingColumnError(fullSelect.error, 'ga4_purchase_claimed')
  ) {
    const basic = await supabase
      .from('orders')
      .select('order_id, payment_status, paid_at, ga4_purchase_sent')
      .eq('order_id', normalized)
      .maybeSingle();
    if (basic.error || !basic.data) {
      return { status: 'skipped', reason: 'order_not_found' };
    }
    row = basic.data as FallbackOrderRow;
  } else {
    return { status: 'skipped', reason: 'order_not_found' };
  }

  if (!row) return { status: 'skipped', reason: 'order_not_found' };
  if (row.ga4_purchase_sent === true) return { status: 'skipped', reason: 'already_sent' };
  if (!isOrderPaid(row)) return { status: 'skipped', reason: 'not_paid' };

  if (claimedGraceNotElapsed(row)) {
    return { status: 'skipped', reason: 'claimed_grace' };
  }

  const attempts = Number(row.ga4_purchase_attempts ?? 0);
  if (attempts >= MAX_MP_ATTEMPTS) {
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
    if (!runAfterRaw) {
      await scheduleGa4PurchaseFallback(normalized);
    }
    return { status: 'skipped', reason: 'delay_not_elapsed' };
  }

  if (!runAfterRaw) {
    await scheduleGa4PurchaseFallback(normalized);
  }

  const locked = await acquireMpLock(normalized);
  if (!locked) return { status: 'skipped', reason: 'lock_not_acquired' };

  const lockedAttempts = Number(locked.ga4_purchase_attempts ?? attempts + 1);
  let sent = false;

  try {
    const order = await getOrderById(normalized);
    const orderForPurchase = order ?? orderLikeFromFallbackRow(locked);
    if (!orderForPurchase) {
      await markMpFailure(normalized, 'order_load_failed', lockedAttempts, true);
      return { status: 'failed', orderId: normalized, error: 'order_load_failed', retryable: true };
    }

    const { value, currency } = purchaseValueAndCurrencyFromOrder(orderForPurchase);
    const items = buildPurchaseAnalyticsItemsFromOrder(orderForPurchase, normalized);
    if (!Number.isFinite(value) || value <= 0 || items.length === 0) {
      await markMpFailure(normalized, 'invalid_purchase_payload', lockedAttempts, false);
      return { status: 'failed', orderId: normalized, error: 'invalid_purchase_payload', retryable: false };
    }

    const gaClientId =
      locked.ga_client_id?.trim() ||
      (order as { ga_client_id?: string }).ga_client_id?.trim() ||
      undefined;

    const result = await sendGa4MeasurementProtocolPurchase({
      transactionId: normalized,
      value,
      currency,
      items,
      clientId: gaClientId,
      sessionId: locked.ga_session_id,
      email: locked.customer_email ?? (order as { customerEmail?: string } | null)?.customerEmail,
      phone: locked.phone ?? (order as { phone?: string } | null)?.phone,
      phoneCountryCode:
        locked.phone_country_code ?? (order as { phoneCountryCode?: string } | null)?.phoneCountryCode,
      gclid: locked.gclid,
      gbraid: locked.gbraid,
      wbraid: locked.wbraid,
    });

    if (result.ok) {
      const marked = await markMpSuccess(normalized);
      if (marked.ok) {
        sent = true;
        console.info('[ga4/fallback] purchase sent via Measurement Protocol', {
          orderId: normalized,
          clientIdUsed: result.clientIdUsed,
        });
        return { status: 'sent', orderId: normalized };
      }
      if (marked.alreadySentRace) {
        return { status: 'skipped', reason: 'already_sent_race' };
      }
      await markMpFailure(normalized, marked.error ?? 'mark_success_failed', lockedAttempts, true);
      return {
        status: 'failed',
        orderId: normalized,
        error: marked.error ?? 'mark_success_failed',
        retryable: true,
      };
    }

    await markMpFailure(normalized, result.error, lockedAttempts, result.retryable);
    console.warn('[ga4/fallback] Measurement Protocol send failed', {
      orderId: normalized,
      error: result.error,
      retryable: result.retryable,
      attempts: lockedAttempts,
    });
    return {
      status: 'failed',
      orderId: normalized,
      error: result.error,
      retryable: result.retryable,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await markMpFailure(normalized, message, lockedAttempts, true);
    return { status: 'failed', orderId: normalized, error: message, retryable: true };
  } finally {
    if (!sent) {
      await releaseMpLock(normalized);
    }
  }
}

export type Ga4FallbackCronResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  /** Skip counts keyed by reason, e.g. { lock_not_acquired: 2 } */
  skippedByReason: Record<string, number>;
  /** Per-order failure details from this run */
  failures: Array<{ orderId: string; error: string; retryable: boolean }>;
  mpConfigured: boolean;
  adsConfigured: boolean;
  supabaseAvailable: boolean;
  adsSent: number;
  adsFailed: number;
  adsSkipped: number;
  adsSkippedByReason: Record<string, number>;
  adsFailures: Array<{ orderId: string; error: string; retryable: boolean }>;
  queryError?: string;
};

/**
 * Non-blocking nudge for request paths (fulfill idempotent re-checks).
 *
 * Schedule-only on purpose: serverless request handlers are frozen as soon as the
 * response is returned, so an unawaited MP send here could acquire
 * `ga4_purchase_mp_lock_at` and then never run the send or bookkeeping — leaving a
 * dangling lock that starves the cron forever. Actual MP sends happen only in
 * `runGa4PurchaseFallbackCron`, where execution is fully awaited.
 */
export function nudgeGa4PurchaseFallback(orderId: string): void {
  const normalized = orderId.trim();
  if (!normalized) return;
  void scheduleGa4PurchaseFallback(normalized).catch((e) =>
    console.error('[ga4/fallback] nudge error:', e),
  );
}

/** Process all pending fallbacks (cron). */
export async function runGa4PurchaseFallbackCron(limit = 25): Promise<Ga4FallbackCronResult> {
  const mpConfigured = isGa4MeasurementProtocolConfigured();
  const adsConfigured = isGoogleAdsConversionUploadConfigured();
  const supabase = getSupabaseAdmin();
  const supabaseAvailable = Boolean(supabase);
  const empty: Ga4FallbackCronResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    skippedByReason: {},
    failures: [],
    mpConfigured,
    adsConfigured,
    supabaseAvailable,
    adsSent: 0,
    adsFailed: 0,
    adsSkipped: 0,
    adsSkippedByReason: {},
    adsFailures: [],
  };

  if (!supabase || (!mpConfigured && !adsConfigured)) {
    if (!mpConfigured && !adsConfigured) {
      console.warn(
        '[ga4/fallback/cron] skipped — neither GA4 MP nor Google Ads conversion upload is configured',
      );
    }
    return empty;
  }

  const now = new Date().toISOString();
  const staleLockBefore = new Date(Date.now() - MP_LOCK_STALE_MS).toISOString();

  const pendingOrderIds = new Set<string>();

  if (mpConfigured) {
    const { data: ga4Rows, error: ga4Error } = await supabase
      .from('orders')
      .select('order_id')
      .eq('payment_status', 'PAID')
      .or('ga4_purchase_sent.is.null,ga4_purchase_sent.eq.false')
      .not('ga4_purchase_fallback_run_after', 'is', null)
      .lte('ga4_purchase_fallback_run_after', now)
      .or(`ga4_purchase_attempts.is.null,ga4_purchase_attempts.lt.${MAX_MP_ATTEMPTS}`)
      .or(`ga4_purchase_mp_lock_at.is.null,ga4_purchase_mp_lock_at.lt.${staleLockBefore}`)
      .order('ga4_purchase_fallback_run_after', { ascending: true })
      .limit(limit);

    if (ga4Error) {
      console.warn('[ga4/fallback/cron] GA4 pending query failed', { error: ga4Error.message });
      return { ...empty, queryError: ga4Error.message };
    }
    for (const row of ga4Rows ?? []) {
      const orderId = String(row.order_id ?? '').trim();
      if (orderId) pendingOrderIds.add(orderId);
    }
  }

  if (adsConfigured) {
    const { data: adsRows, error: adsError } = await supabase
      .from('orders')
      .select('order_id')
      .eq('payment_status', 'PAID')
      .eq('ga4_purchase_sent', true)
      .or('google_ads_conversion_sent.is.null,google_ads_conversion_sent.eq.false')
      .not('ga4_purchase_fallback_run_after', 'is', null)
      .lte('ga4_purchase_fallback_run_after', now)
      .or(`google_ads_conversion_attempts.is.null,google_ads_conversion_attempts.lt.${MAX_MP_ATTEMPTS}`)
      .order('ga4_purchase_fallback_run_after', { ascending: true })
      .limit(limit);

    if (adsError) {
      if (isSupabaseMissingColumnError(adsError, 'google_ads_conversion_sent')) {
        console.warn('[ga4/fallback/cron] Ads columns missing — apply migration 20260710120000');
      } else {
        console.warn('[ga4/fallback/cron] Ads pending query failed', { error: adsError.message });
        return { ...empty, queryError: adsError.message };
      }
    } else {
      for (const row of adsRows ?? []) {
        const orderId = String(row.order_id ?? '').trim();
        if (orderId) pendingOrderIds.add(orderId);
      }
    }
  }

  const orderIds = Array.from(pendingOrderIds).slice(0, limit);
  if (!orderIds.length) {
    return empty;
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const skippedByReason: Record<string, number> = {};
  const failures: Ga4FallbackCronResult['failures'] = [];
  let adsSent = 0;
  let adsFailed = 0;
  let adsSkipped = 0;
  const adsSkippedByReason: Record<string, number> = {};
  const adsFailures: Ga4FallbackCronResult['adsFailures'] = [];

  for (const orderId of orderIds) {
    if (mpConfigured) {
      const result = await tryProcessGa4PurchaseFallback(orderId);
      if (result.status === 'sent') {
        sent += 1;
      } else if (result.status === 'failed') {
        failed += 1;
        failures.push({ orderId, error: result.error, retryable: result.retryable });
      } else {
        skipped += 1;
        skippedByReason[result.reason] = (skippedByReason[result.reason] ?? 0) + 1;
      }
    }

    if (adsConfigured) {
      const adsResult = await tryProcessGoogleAdsConversionUpload(orderId);
      if (adsResult.status === 'sent') {
        adsSent += 1;
      } else if (adsResult.status === 'failed') {
        adsFailed += 1;
        adsFailures.push({ orderId, error: adsResult.error, retryable: adsResult.retryable });
      } else {
        adsSkipped += 1;
        adsSkippedByReason[adsResult.reason] = (adsSkippedByReason[adsResult.reason] ?? 0) + 1;
      }
    }
  }

  return {
    processed: orderIds.length,
    sent,
    failed,
    skipped,
    skippedByReason,
    failures,
    mpConfigured,
    adsConfigured,
    supabaseAvailable,
    adsSent,
    adsFailed,
    adsSkipped,
    adsSkippedByReason,
    adsFailures,
  };
}
