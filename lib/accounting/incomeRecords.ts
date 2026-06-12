import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { netAfterProcessingFee, processingFeeForIncome } from '@/lib/accounting/stripeFee';
import {
  incomeDocumentationComplete,
  type IncomeRecord,
  type IncomeFilters,
  type IncomeSourceMode,
  type IncomeSourceType,
  type IncomePaymentMethod,
  type MoneyLocation,
  type IncomeStatus,
  type MoneyLocationTotal,
  type LedgerChannelMoneyMovement,
  type LedgerMovementKind,
} from '@/types/accounting';
import {
  expenseDocumentationComplete,
  parseExpenseBillTrackingJson,
  COGS_EXPENSE_CATEGORIES,
} from '@/types/expenses';
import {
  getRefundsTotalInPeriod,
  getStripeRefundsTotalInPeriod,
  getStripeRefundsTotalThroughDate,
} from '@/lib/accounting/incomeRefunds';

const TABLE = 'income_records';

type OverviewIncomeAggRow = {
  id?: unknown;
  paid_date?: unknown;
  amount?: unknown;
  income_status?: unknown;
  source_mode?: unknown;
  money_location?: unknown;
  payment_method?: unknown;
  processing_fee_amount?: unknown;
  description?: unknown;
  created_at?: unknown;
  confirmed_at?: unknown;
};

type OverviewExpenseAggRow = {
  id?: unknown;
  date?: unknown;
  amount?: unknown;
  payment_method?: unknown;
  description?: unknown;
  category?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

type OverviewTransferAggRow = {
  id?: unknown;
  amount?: unknown;
  from_location?: unknown;
  to_location?: unknown;
  status?: unknown;
  transfer_date?: unknown;
  bank_received_date?: unknown;
  note?: unknown;
  created_at?: unknown;
};

type OverviewWithdrawalAggRow = {
  id?: unknown;
  amount?: unknown;
  from_location?: unknown;
  status?: unknown;
  withdrawal_date?: unknown;
  purpose?: unknown;
  notes?: unknown;
  created_at?: unknown;
};

const ACCOUNTING_TRANSFERS_AGG_SELECT =
  'id, amount, from_location, to_location, status, transfer_date, bank_received_date, note, created_at';

const ACCOUNTING_WITHDRAWALS_AGG_SELECT =
  'id, amount, from_location, status, withdrawal_date, purpose, notes, created_at';

const LEDGER_MOVEMENT_SUMMARY_MAX = 56;

function shortenMovementSummary(raw: string | null | undefined, max = LEDGER_MOVEMENT_SUMMARY_MAX): string {
  const t = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  return t.length > max ? `${t.slice(0, Math.max(0, max - 1))}…` : t;
}

function ledgerTransferSortDate(row: OverviewTransferAggRow): string {
  const td = String(row.transfer_date ?? '').slice(0, 10);
  const br =
    row.bank_received_date != null && String(row.bank_received_date).trim() !== ''
      ? String(row.bank_received_date).slice(0, 10)
      : '';
  if (!td && !br) return '1970-01-01';
  if (!br) return td;
  if (!td) return br;
  return td > br ? td : br;
}

function ledgerBucketReadable(loc: string): string {
  if (loc === 'bank') return 'Bank';
  if (loc === 'cash') return 'Cash';
  if (loc === 'stripe') return 'Stripe';
  if (loc === 'other') return 'Other';
  return loc || 'Bucket';
}

function movementParseIsoMs(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

/** Start of UTC calendar day for YYYY-MM-DD (stable tie-break vs local parsing). */
function movementYmdUtcStartMs(ymd: string): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!d) return null;
  const y = Number(d[1]);
  const m = Number(d[2]);
  const day = Number(d[3]);
  if (![y, m, day].every((n) => Number.isFinite(n))) return null;
  return Date.UTC(y, m - 1, day);
}

type MovementAcc = {
  sortDate: string;
  /** Prefer real timestamps so “same day” and newly saved rows rank correctly */
  sortMs: number;
  tieBreaker: string;
  summary: string;
  delta: number;
  kind: LedgerMovementKind;
};

function buildLedgerRecentMovementsPerLocation(params: {
  ledgerIncomeRows: OverviewIncomeAggRow[];
  ledgerExpenseRows: OverviewExpenseAggRow[];
  ledgerTransferRows: OverviewTransferAggRow[];
  ledgerWithdrawalRows?: OverviewWithdrawalAggRow[];
  effectiveIncomeLocation: (row: {
    payment_method?: unknown;
    money_location?: unknown;
  }) => string;
  limit?: number;
  /** When true, include manual rows still in `pending` (matches ledger bucket totals). Default true. */
  ledgerIncludePendingManualIncome?: boolean;
}): Record<string, LedgerChannelMoneyMovement[]> {
  const limit = params.limit ?? 3;
  const includePendingManual = params.ledgerIncludePendingManualIncome ?? true;
  const byLoc = new Map<string, MovementAcc[]>();

  function append(locRaw: string, acc: MovementAcc) {
    const loc = locRaw.trim().toLowerCase() || 'other';
    const existing = byLoc.get(loc);
    if (existing) existing.push(acc);
    else byLoc.set(loc, [acc]);
  }

  for (const row of params.ledgerIncomeRows) {
    if (!incomeRecordCountsTowardLedgerBuckets(row, { includePendingManual })) {
      continue;
    }
    const gross = parseFloat(String(row.amount)) || 0;
    if (gross === 0) continue;
    const pm = row.payment_method as IncomePaymentMethod;
    const feeStored = row.processing_fee_amount;
    const fee =
      feeStored != null && String(feeStored) !== ''
        ? parseFloat(String(feeStored)) || 0
        : processingFeeForIncome(gross, pm);
    const net = netAfterProcessingFee(gross, fee);
    const loc = params.effectiveIncomeLocation(row);
    const paid = String(row.paid_date ?? '').slice(0, 10);
    if (!paid) continue;
    const id = String(row.id ?? '');
    const desc = shortenMovementSummary(row.description != null ? String(row.description) : '');
    const pendingManual =
      String(row.income_status ?? '') === 'pending' && String(row.source_mode ?? '') === 'manual';
    const paidStart = movementYmdUtcStartMs(paid) ?? 0;
    const sortMs =
      movementParseIsoMs(row.confirmed_at) ?? movementParseIsoMs(row.created_at) ?? paidStart;
    append(loc, {
      sortDate: paid,
      sortMs,
      tieBreaker: id || paid,
      summary: pendingManual ? `[Pending] ${desc || 'Income'}` : desc || 'Income',
      delta: roundMoney(net),
      kind: 'income',
    });
  }

  for (const row of params.ledgerExpenseRows) {
    const amount = parseFloat(String(row.amount)) || 0;
    if (amount === 0) continue;
    const pm = String(row.payment_method ?? 'other');
    const loc = expensePaymentMethodToLocation(pm);
    const dateStr = String(row.date ?? '').slice(0, 10);
    if (!dateStr) continue;
    const id = String(row.id ?? '');
    const desc = shortenMovementSummary(row.description != null ? String(row.description) : '');
    const cat = String(row.category ?? '').trim();
    const dayStart = movementYmdUtcStartMs(dateStr) ?? 0;
    const sortMs =
      movementParseIsoMs(row.updated_at) ?? movementParseIsoMs(row.created_at) ?? dayStart;
    append(loc, {
      sortDate: dateStr,
      sortMs,
      tieBreaker: id || dateStr,
      summary: desc || (cat ? `${cat} · expense` : 'Expense'),
      delta: roundMoney(-amount),
      kind: 'expense',
    });
  }

  for (const t of params.ledgerTransferRows) {
    const status = String(t.status ?? 'received').trim().toLowerCase();
    if (status !== 'pending' && status !== 'received' && status !== 'reconciled') continue;
    const amt = parseFloat(String(t.amount)) || 0;
    if (amt === 0) continue;
    const from = String(t.from_location ?? '').trim().toLowerCase();
    const to = String(t.to_location ?? '').trim().toLowerCase();
    if (!from || !to) continue;
    const sortDate = ledgerTransferSortDate(t);
    const tid = String(t.id ?? '');
    const note = shortenMovementSummary(t.note != null ? String(t.note) : '');
    const baseTie = tid || `${from}-${to}-${sortDate}`;
    const dayStart = movementYmdUtcStartMs(sortDate) ?? 0;
    const sortMs = movementParseIsoMs(t.created_at) ?? dayStart;

    append(from, {
      sortDate,
      sortMs,
      tieBreaker: `${baseTie}:out`,
      summary: note || `→ ${ledgerBucketReadable(to)}`,
      delta: roundMoney(-amt),
      kind: 'transfer',
    });
    append(to, {
      sortDate,
      sortMs,
      tieBreaker: `${baseTie}:in`,
      summary: note || `← ${ledgerBucketReadable(from)}`,
      delta: roundMoney(amt),
      kind: 'transfer',
    });
  }

  for (const w of params.ledgerWithdrawalRows ?? []) {
    const status = String(w.status ?? 'confirmed').trim().toLowerCase();
    if (status !== 'confirmed') continue;
    const amt = parseFloat(String(w.amount)) || 0;
    if (amt === 0) continue;
    const from = String(w.from_location ?? '').trim().toLowerCase();
    if (!from) continue;
    const sortDate = String(w.withdrawal_date ?? '').slice(0, 10);
    if (!sortDate) continue;
    const wid = String(w.id ?? '');
    const purpose = shortenMovementSummary(w.purpose != null ? String(w.purpose) : '');
    const dayStart = movementYmdUtcStartMs(sortDate) ?? 0;
    const sortMs = movementParseIsoMs(w.created_at) ?? dayStart;
    append(from, {
      sortDate,
      sortMs,
      tieBreaker: wid || `${from}-${sortDate}`,
      summary: purpose || 'Owner withdrawal',
      delta: roundMoney(-amt),
      kind: 'withdrawal',
    });
  }

  function clipLocation(arr: MovementAcc[]): LedgerChannelMoneyMovement[] {
    return [...arr]
      .sort((a, b) => {
        if (b.sortMs !== a.sortMs) return b.sortMs - a.sortMs;
        const c = b.sortDate.localeCompare(a.sortDate);
        if (c !== 0) return c;
        return b.tieBreaker.localeCompare(a.tieBreaker);
      })
      .slice(0, limit)
      .map((m) => ({
        occurredOn: m.sortDate,
        summary: m.summary,
        delta: m.delta,
        kind: m.kind,
      }));
  }

  const out: Record<string, LedgerChannelMoneyMovement[]> = {};

  for (const loc of PRIMARY_LEDGER_LOCATIONS) {
    out[loc] = clipLocation(byLoc.get(loc) ?? []);
  }

  for (const [loc, arr] of Array.from(byLoc.entries())) {
    const isPrimary = PRIMARY_LEDGER_LOCATIONS.includes(loc as (typeof PRIMARY_LEDGER_LOCATIONS)[number]);
    if (!isPrimary) out[loc] = clipLocation(arr);
  }

  return out;
}

/** PostgREST returns at most this many rows per request unless paginated. */
const OVERVIEW_LEDGER_PAGE_SIZE = 1000;

const PRIMARY_LEDGER_LOCATIONS = ['stripe', 'bank', 'cash', 'other'] as const;

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyLedgerSlot(location: string): MoneyLocationTotal {
  return {
    location,
    grossTotal: 0,
    netAfterFees: 0,
    allocatedExpenses: 0,
    transfersNet: 0,
    netAfterFeesAndExpenses: 0,
  };
}

function roundLedgerRow(r: MoneyLocationTotal): MoneyLocationTotal {
  const transfersNet = roundMoney(r.transfersNet ?? 0);
  return {
    location: r.location,
    grossTotal: roundMoney(r.grossTotal),
    netAfterFees: roundMoney(r.netAfterFees),
    allocatedExpenses: roundMoney(r.allocatedExpenses),
    transfersNet,
    netAfterFeesAndExpenses: roundMoney(r.netAfterFeesAndExpenses),
  };
}

/** Stable ordering for overview: core buckets first, then any unexpected `location` strings from data. */
function normalizeLedgerLocationTotals(rows: MoneyLocationTotal[]): MoneyLocationTotal[] {
  const map = new Map(rows.map((r) => [r.location, r]));
  const primarySet = new Set<string>(PRIMARY_LEDGER_LOCATIONS);
  const primary = PRIMARY_LEDGER_LOCATIONS.map((loc) => {
    const r = map.get(loc);
    return r ? roundLedgerRow(r) : emptyLedgerSlot(loc);
  });
  const extras = rows.filter((r) => !primarySet.has(r.location)).map(roundLedgerRow);
  return [...primary, ...extras];
}

async function fetchAllLedgerIncomeRows(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  ledgerBalanceThrough: string
): Promise<OverviewIncomeAggRow[]> {
  const acc: OverviewIncomeAggRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'id, paid_date, amount, income_status, source_mode, money_location, payment_method, processing_fee_amount, description, created_at, confirmed_at'
      )
      .lte('paid_date', ledgerBalanceThrough)
      .neq('income_status', 'cancelled')
      .order('paid_date', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + OVERVIEW_LEDGER_PAGE_SIZE - 1);

    if (error) {
      console.error('[incomeRecords] ledger income pagination:', error.message);
      break;
    }
    const chunk = data ?? [];
    acc.push(...chunk);
    if (chunk.length < OVERVIEW_LEDGER_PAGE_SIZE) break;
    from += OVERVIEW_LEDGER_PAGE_SIZE;
  }
  return acc;
}

async function fetchAllLedgerExpenseRows(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  ledgerBalanceThrough: string
): Promise<OverviewExpenseAggRow[]> {
  const acc: OverviewExpenseAggRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, date, amount, payment_method, description, category, created_at, updated_at')
      .lte('date', ledgerBalanceThrough)
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + OVERVIEW_LEDGER_PAGE_SIZE - 1);

    if (error) {
      console.error('[incomeRecords] ledger expense pagination:', error.message);
      break;
    }
    const chunk = data ?? [];
    acc.push(...chunk);
    if (chunk.length < OVERVIEW_LEDGER_PAGE_SIZE) break;
    from += OVERVIEW_LEDGER_PAGE_SIZE;
  }
  return acc;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export interface IncomeListResult {
  records: IncomeRecord[];
  total: number;
  /** Confirmed rows: gross sum */
  totalConfirmedAmount: number;
  /** Confirmed Stripe rows only: sum of processing_fee_amount */
  totalConfirmedStripeFees: number;
  /** Confirmed rows: gross minus processing fees */
  totalConfirmedNetAmount: number;
  totalPendingAmount: number;
  /** Count of rows in the filtered set that still need an uploaded proof (non-Stripe only). */
  missingProofCount: number;
  error?: string;
}

export async function getIncomeRecords(
  filters: IncomeFilters = {},
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 30 }
): Promise<IncomeListResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      records: [],
      total: 0,
      totalConfirmedAmount: 0,
      totalConfirmedStripeFees: 0,
      totalConfirmedNetAmount: 0,
      totalPendingAmount: 0,
      missingProofCount: 0,
      error: 'Supabase not configured',
    };
  }

  const { page, pageSize } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from(TABLE).select('*', { count: 'exact' });

  // Period filter uses paid_date (the day money actually arrived) so monthly
  // totals line up with expense `date`. Falls back transparently for legacy
  // rows because the migration backfills paid_date from created_at.
  if (filters.dateFrom)     query = query.gte('paid_date', filters.dateFrom.slice(0, 10));
  if (filters.dateTo)       query = query.lte('paid_date', filters.dateTo.slice(0, 10));
  if (filters.source_mode && filters.source_mode !== 'all')   query = query.eq('source_mode', filters.source_mode);
  if (filters.source_type && filters.source_type !== 'all')   query = query.eq('source_type', filters.source_type);
  if (filters.income_status && filters.income_status !== 'all') query = query.eq('income_status', filters.income_status);
  if (filters.receipt === 'missing') {
    query = query.neq('payment_method', 'stripe').eq('receipt_attached', false);
  }
  if (filters.receipt === 'attached') {
    query = query.or('payment_method.eq.stripe,receipt_attached.eq.true');
  }

  const { data, count, error } = await query
    .order('paid_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[incomeRecords] list error:', error.message);
    return {
      records: [],
      total: 0,
      totalConfirmedAmount: 0,
      totalConfirmedStripeFees: 0,
      totalConfirmedNetAmount: 0,
      totalPendingAmount: 0,
      missingProofCount: 0,
      error: error.message,
    };
  }

  // Aggregate amount totals + missing-proof count over the full filtered set.
  let amountQuery = supabase
    .from(TABLE)
    .select('amount, income_status, payment_method, processing_fee_amount, receipt_attached')
    .neq('income_status', 'cancelled');
  if (filters.dateFrom)   amountQuery = amountQuery.gte('paid_date', filters.dateFrom.slice(0, 10));
  if (filters.dateTo)     amountQuery = amountQuery.lte('paid_date', filters.dateTo.slice(0, 10));
  if (filters.source_mode && filters.source_mode !== 'all') amountQuery = amountQuery.eq('source_mode', filters.source_mode);
  if (filters.source_type && filters.source_type !== 'all') amountQuery = amountQuery.eq('source_type', filters.source_type);
  if (filters.receipt === 'missing') {
    amountQuery = amountQuery.neq('payment_method', 'stripe').eq('receipt_attached', false);
  }
  if (filters.receipt === 'attached') {
    amountQuery = amountQuery.or('payment_method.eq.stripe,receipt_attached.eq.true');
  }

  const { data: amountRows } = await amountQuery;
  let totalConfirmedAmount = 0;
  let totalConfirmedStripeFees = 0;
  let totalConfirmedNetAmount = 0;
  let totalPendingAmount = 0;
  let missingProofCount = 0;
  for (const row of amountRows ?? []) {
    const gross = parseFloat(String(row.amount)) || 0;
    const feeRaw = row.processing_fee_amount;
    const fee =
      feeRaw != null && feeRaw !== ''
        ? parseFloat(String(feeRaw)) || 0
        : processingFeeForIncome(gross, row.payment_method as IncomePaymentMethod);
    if (row.income_status === 'confirmed') {
      totalConfirmedAmount += gross;
      totalConfirmedStripeFees += fee;
      totalConfirmedNetAmount += netAfterProcessingFee(gross, fee);
    } else {
      totalPendingAmount += gross;
    }
    if (
      !incomeDocumentationComplete({
        payment_method: row.payment_method as IncomePaymentMethod,
        receipt_attached: row.receipt_attached === true,
        income_status: row.income_status as IncomeStatus,
      })
    ) {
      missingProofCount++;
    }
  }

  return {
    records: (data ?? []) as IncomeRecord[],
    total: count ?? 0,
    totalConfirmedAmount,
    totalConfirmedStripeFees,
    totalConfirmedNetAmount,
    totalPendingAmount,
    missingProofCount,
  };
}

// ─── Single record ────────────────────────────────────────────────────────────

export async function getIncomeRecordById(id: string): Promise<IncomeRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[incomeRecords] getById error:', error.message);
    return null;
  }
  return data as IncomeRecord;
}

// ─── Check for existing order_id ──────────────────────────────────────────────

export async function incomeExistsForOrder(orderId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('order_id', orderId)
    .single();

  return !!data;
}

/**
 * Hard-delete the income record linked to an order (e.g. when the order is deleted).
 * Safe to call even if no income record exists — silently does nothing in that case.
 */
export async function cancelIncomeForOrder(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase
    .from(TABLE)
    .delete()
    .eq('order_id', orderId);
}

/**
 * Hard-delete a single income record by its UUID.
 * Returns true on success, false if not found or on error.
 */
export async function deleteIncomeRecord(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);

  return !error;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateIncomeInput {
  order_id?: string | null;
  source_mode: IncomeSourceMode;
  source_type: IncomeSourceType;
  amount: number;
  currency?: string;
  payment_method: IncomePaymentMethod;
  money_location: MoneyLocation;
  income_status?: IncomeStatus;
  description: string;
  external_reference?: string | null;
  proof_file_path?: string | null;
  receipt_attached?: boolean;
  notes?: string | null;
  /** YYYY-MM-DD — when the money actually arrived. Defaults to today on the DB side. */
  paid_date?: string | null;
  created_by: string;
}

export async function createIncomeRecord(
  input: CreateIncomeInput
): Promise<{ record: IncomeRecord | null; error?: string; duplicate?: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { record: null, error: 'Supabase not configured' };

  const fee = processingFeeForIncome(input.amount, input.payment_method);

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      order_id:          input.order_id ?? null,
      source_mode:       input.source_mode,
      source_type:       input.source_type,
      amount:            input.amount,
      processing_fee_amount: fee,
      currency:          input.currency ?? 'THB',
      payment_method:    input.payment_method,
      money_location:    input.money_location,
      income_status:     input.income_status ?? 'confirmed',
      description:       input.description,
      external_reference: input.external_reference ?? null,
      proof_file_path:   input.proof_file_path ?? null,
      receipt_attached:  input.receipt_attached ?? false,
      notes:             input.notes ?? null,
      paid_date:         input.paid_date ?? undefined, // let DB default fire when omitted
      created_by:        input.created_by,
      confirmed_at:      (input.income_status ?? 'confirmed') === 'confirmed' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { record: null, duplicate: true, error: 'Income record already exists for this order' };
    }
    console.error('[incomeRecords] createIncomeRecord error:', error.message);
    return { record: null, error: error.message };
  }

  return { record: data as IncomeRecord };
}

// ─── Upsert for auto-order (idempotent) ──────────────────────────────────────

export interface UpsertOrderIncomeInput {
  order_id: string;
  amount: number;
  currency?: string;
  payment_method: IncomePaymentMethod;
  money_location: MoneyLocation;
  description: string;
  external_reference?: string | null;
  created_by?: string;
  /** YYYY-MM-DD — when the order was paid. Defaults to today if omitted. */
  paid_date?: string | null;
  /**
   * When set (including 0), stored on `processing_fee_amount` instead of the estimated % from {@link processingFeeForIncome}.
   * Populated from Stripe `balance_transaction.fee` for Stripe checkouts when available.
   */
  processing_fee_amount?: number | null;
}

/**
 * Idempotent: inserts a confirmed income record for an order.
 * If one already exists (by UNIQUE order_id), does nothing.
 * Never throws — safe to call fire-and-forget.
 */
export async function upsertOrderIncomeRecord(
  input: UpsertOrderIncomeInput
): Promise<{ created: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { created: false, error: 'Supabase not configured' };

  try {
    const now = new Date().toISOString();
    const hasFeeOverride =
      input.processing_fee_amount != null && Number.isFinite(Number(input.processing_fee_amount));
    const fee = hasFeeOverride
      ? Math.max(0, Number(input.processing_fee_amount))
      : processingFeeForIncome(input.amount, input.payment_method);
    const { error } = await supabase.from(TABLE).insert({
      order_id:          input.order_id,
      source_mode:       'auto_order',
      source_type:       'order',
      amount:            input.amount,
      processing_fee_amount: fee,
      currency:          input.currency ?? 'THB',
      payment_method:    input.payment_method,
      money_location:    input.money_location,
      income_status:     'confirmed',
      description:       input.description,
      external_reference: input.external_reference ?? null,
      proof_file_path:   null,
      receipt_attached:  false,
      notes:             null,
      paid_date:         input.paid_date ?? undefined,
      created_by:        input.created_by ?? 'system',
      confirmed_at:      now,
    });

    if (error) {
      if (error.code === '23505') {
        return { created: false }; // Already exists — idempotent skip
      }
      console.error('[incomeRecords] upsertOrderIncomeRecord error:', error.message);
      return { created: false, error: error.message };
    }

    return { created: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[incomeRecords] upsertOrderIncomeRecord exception:', msg);
    return { created: false, error: msg };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateIncomeInput {
  income_status?: IncomeStatus;
  money_location?: MoneyLocation;
  proof_file_path?: string | null;
  receipt_attached?: boolean;
  notes?: string | null;
}

export async function updateIncomeRecord(
  id: string,
  input: UpdateIncomeInput
): Promise<{ record: IncomeRecord | null; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { record: null, error: 'Supabase not configured' };

  const updatePayload: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  // Auto-set confirmed_at when status transitions to confirmed
  if (input.income_status === 'confirmed') {
    updatePayload.confirmed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[incomeRecords] updateIncomeRecord error:', error.message);
    return { record: null, error: error.message };
  }

  return { record: data as IncomeRecord };
}

// ─── Accounting overview aggregation ─────────────────────────────────────────

export interface OverviewPeriodFilter {
  dateFrom?: string;
  dateTo?: string;
}

function pad2ymd(n: number) {
  return String(n).padStart(2, '0');
}

function fmtYmdParts(y: number, m: number, d: number): string {
  return `${y}-${pad2ymd(m)}-${pad2ymd(d)}`;
}

function cmpYmd(
  a: { y: number; m: number; d: number },
  b: { y: number; m: number; d: number }
): number {
  return a.y * 10000 + a.m * 100 + a.d - (b.y * 10000 + b.m * 100 + b.d);
}

function parseYmdCalendar(s: string | undefined): { y: number; m: number; d: number } | null {
  if (!s || s.length < 10) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.slice(0, 10));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (![y, mo, d].every((x) => Number.isFinite(x))) return null;
  return { y, m: mo, d };
}

function calendarTodayLocal(): { y: number; m: number; d: number } {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
}

/**
 * Calendar YTD for channel balances: Jan 1 through the reference day in that calendar year.
 * Uses plain YYYY-MM-DD calendar math (no timezone shifts).
 *
 * Reference day:
 * - `dateTo` when set (with a common fix: range `YYYY-01-01 → (Y+1)-01-01` means full calendar year Y).
 * - Else **today** when `dateFrom` only or both unset (open-high bound should not anchor YTD to range start).
 */
export function resolveCalendarYtdForOverview(filter: OverviewPeriodFilter): {
  dateFrom: string;
  dateTo: string;
} {
  const dateToStr = filter.dateTo && filter.dateTo.length >= 10 ? filter.dateTo.slice(0, 10) : undefined;
  const dateFromStr = filter.dateFrom && filter.dateFrom.length >= 10 ? filter.dateFrom.slice(0, 10) : undefined;
  const today = calendarTodayLocal();

  let ref: { y: number; m: number; d: number };

  if (dateToStr) {
    const t = parseYmdCalendar(dateToStr);
    if (!t) {
      ref = today;
    } else {
      const f = parseYmdCalendar(dateFromStr ?? '');
      // Exclusive upper bound: Jan 1 (Y+1) with Jan 1 Y lower bound → include all of year Y through Dec 31 Y.
      const exclusiveYearEnd =
        t.m === 1 &&
        t.d === 1 &&
        f !== null &&
        f.m === 1 &&
        f.d === 1 &&
        t.y === f.y + 1 &&
        cmpYmd(f, t) < 0;
      if (exclusiveYearEnd) {
        ref = { y: f.y, m: 12, d: 31 };
      } else {
        ref = t;
      }
    }
  } else {
    ref = today;
  }

  const dec31: { y: number; m: number; d: number } = { y: ref.y, m: 12, d: 31 };
  let end = cmpYmd(ref, dec31) > 0 ? dec31 : ref;

  // Never ask Supabase for future rows — cap YTD end at today.
  if (cmpYmd(end, today) > 0) {
    end = today;
  }

  const yearStart = { y: end.y, m: 1, d: 1 };
  return { dateFrom: fmtYmdParts(yearStart.y, yearStart.m, yearStart.d), dateTo: fmtYmdParts(end.y, end.m, end.d) };
}

/**
 * Transfers tied to [dateFrom, dateTo]: `transfer_date` in range **or** `bank_received_date`
 * in range (when set). Deduped by row id.
 */
async function fetchTransfersOverlappingDateRange(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  dateFrom: string,
  dateTo: string
): Promise<OverviewTransferAggRow[]> {
  const [{ data: byTransferDate }, { data: byBankReceived }] = await Promise.all([
    supabase
      .from('accounting_transfers')
      .select(ACCOUNTING_TRANSFERS_AGG_SELECT)
      .gte('transfer_date', dateFrom)
      .lte('transfer_date', dateTo),
    supabase
      .from('accounting_transfers')
      .select(ACCOUNTING_TRANSFERS_AGG_SELECT)
      .not('bank_received_date', 'is', null)
      .gte('bank_received_date', dateFrom)
      .lte('bank_received_date', dateTo),
  ]);

  const map = new Map<string, OverviewTransferAggRow>();
  let anon = 0;
  for (const row of [...(byTransferDate ?? []), ...(byBankReceived ?? [])]) {
    const id = String((row as { id?: unknown }).id ?? '');
    const key = id || `anon-${anon++}`;
    map.set(key, row as OverviewTransferAggRow);
  }
  return Array.from(map.values());
}

/** Transfers that affect the ledger on or before `dateTo` (inclusive). Paginated (two streams deduped by id). */
async function fetchTransfersThroughDate(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  dateTo: string
): Promise<OverviewTransferAggRow[]> {
  const map = new Map<string, OverviewTransferAggRow>();
  let anon = 0;

  async function pullTransferDatePages() {
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from('accounting_transfers')
        .select(ACCOUNTING_TRANSFERS_AGG_SELECT)
        .lte('transfer_date', dateTo)
        .order('id', { ascending: true })
        .range(from, from + OVERVIEW_LEDGER_PAGE_SIZE - 1);

      if (error) {
        console.error('[incomeRecords] ledger transfers pagination:', error.message);
        break;
      }
      const chunk = data ?? [];
      for (const row of chunk) {
        const id = String((row as { id?: unknown }).id ?? '');
        const key = id || `anon-${anon++}`;
        map.set(key, row as OverviewTransferAggRow);
      }
      if (chunk.length < OVERVIEW_LEDGER_PAGE_SIZE) break;
      from += OVERVIEW_LEDGER_PAGE_SIZE;
    }
  }

  async function pullBankReceivedPages() {
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from('accounting_transfers')
        .select(ACCOUNTING_TRANSFERS_AGG_SELECT)
        .not('bank_received_date', 'is', null)
        .lte('bank_received_date', dateTo)
        .order('id', { ascending: true })
        .range(from, from + OVERVIEW_LEDGER_PAGE_SIZE - 1);

      if (error) {
        console.error('[incomeRecords] ledger transfers pagination:', error.message);
        break;
      }
      const chunk = data ?? [];
      for (const row of chunk) {
        const id = String((row as { id?: unknown }).id ?? '');
        const key = id || `anon-${anon++}`;
        map.set(key, row as OverviewTransferAggRow);
      }
      if (chunk.length < OVERVIEW_LEDGER_PAGE_SIZE) break;
      from += OVERVIEW_LEDGER_PAGE_SIZE;
    }
  }

  await pullTransferDatePages();
  await pullBankReceivedPages();

  return Array.from(map.values());
}

async function fetchWithdrawalsInDateRange(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  dateFrom: string,
  dateTo: string
): Promise<OverviewWithdrawalAggRow[]> {
  const { data, error } = await supabase
    .from('accounting_withdrawals')
    .select(ACCOUNTING_WITHDRAWALS_AGG_SELECT)
    .gte('withdrawal_date', dateFrom)
    .lte('withdrawal_date', dateTo);

  if (error) {
    console.error('[incomeRecords] fetchWithdrawalsInDateRange:', error.message);
    return [];
  }
  return (data ?? []) as OverviewWithdrawalAggRow[];
}

/** Withdrawals that affect the ledger on or before `dateTo` (inclusive). Paginated. */
async function fetchWithdrawalsThroughDate(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  dateTo: string
): Promise<OverviewWithdrawalAggRow[]> {
  const rows: OverviewWithdrawalAggRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('accounting_withdrawals')
      .select(ACCOUNTING_WITHDRAWALS_AGG_SELECT)
      .lte('withdrawal_date', dateTo)
      .order('id', { ascending: true })
      .range(from, from + OVERVIEW_LEDGER_PAGE_SIZE - 1);

    if (error) {
      console.error('[incomeRecords] ledger withdrawals pagination:', error.message);
      break;
    }
    const chunk = data ?? [];
    rows.push(...(chunk as OverviewWithdrawalAggRow[]));
    if (chunk.length < OVERVIEW_LEDGER_PAGE_SIZE) break;
    from += OVERVIEW_LEDGER_PAGE_SIZE;
  }
  return rows;
}

function expensePaymentMethodToLocation(pm: string): MoneyLocation {
  const p = String(pm ?? '').trim().toLowerCase();
  if (p === 'cash') return 'cash';
  if (p === 'bank_transfer') return 'bank';
  if (p === 'card') return 'bank';
  if (p === 'qr_payment') return 'bank';
  // Stripe balance changes only via sales (income) and payouts (transfers/refunds)—not petty operating spend.
  if (p === 'stripe') return 'bank';
  if (p === 'other') return 'other';
  return 'other';
}

/** Used for ledger “where money is”: auto-order rows stay confirmed-only; manual may be pending until proof. */
function incomeRecordCountsTowardLedgerBuckets(row: OverviewIncomeAggRow, opts?: { includePendingManual?: boolean }): boolean {
  const st = String(row.income_status ?? '');
  if (st === 'cancelled') return false;
  if (st === 'confirmed') return true;
  if (
    opts?.includePendingManual === true &&
    st === 'pending' &&
    String(row.source_mode ?? '') === 'manual'
  ) {
    return true;
  }
  return false;
}

function buildIncomeByLocationBreakdown(
  incomeRows: OverviewIncomeAggRow[] | null | undefined,
  expenseRows: OverviewExpenseAggRow[] | null | undefined,
  transferRows: OverviewTransferAggRow[] | null | undefined,
  withdrawalRows: OverviewWithdrawalAggRow[] | null | undefined,
  effectiveIncomeLocation: (row: { payment_method?: unknown; money_location?: unknown }) => string,
  opts?: { stripeRefundsTotal?: number; ledgerIncludePendingManualIncome?: boolean }
): MoneyLocationTotal[] {
  const locationGross: Record<string, number> = {};
  const locationNet: Record<string, number> = {};
  for (const row of incomeRows ?? []) {
    if (!incomeRecordCountsTowardLedgerBuckets(row, { includePendingManual: opts?.ledgerIncludePendingManualIncome }))
      continue;
    const gross = parseFloat(String(row.amount)) || 0;
    const pm = row.payment_method as IncomePaymentMethod;
    const feeStored = row.processing_fee_amount;
    const fee =
      feeStored != null && String(feeStored) !== ''
        ? parseFloat(String(feeStored)) || 0
        : processingFeeForIncome(gross, pm);
    const net = netAfterProcessingFee(gross, fee);
    const loc = effectiveIncomeLocation(row);
    locationGross[loc] = (locationGross[loc] ?? 0) + gross;
    locationNet[loc] = (locationNet[loc] ?? 0) + net;
  }

  const stripeRefunds = opts?.stripeRefundsTotal ?? 0;
  if (stripeRefunds > 0) {
    locationNet.stripe = (locationNet.stripe ?? 0) - stripeRefunds;
  }

  const expensesByLocation: Record<string, number> = {};
  for (const row of expenseRows ?? []) {
    const amount = parseFloat(String(row.amount)) || 0;
    const pm = String(row.payment_method ?? 'other');
    const loc = expensePaymentMethodToLocation(pm);
    expensesByLocation[loc] = (expensesByLocation[loc] ?? 0) + amount;
  }

  const transferNetByLocation: Record<string, number> = {};
  for (const t of transferRows ?? []) {
    const status = String(t.status ?? 'received').trim().toLowerCase();
    if (status !== 'pending' && status !== 'received' && status !== 'reconciled') continue;
    const amt = parseFloat(String(t.amount)) || 0;
    const from = String(t.from_location ?? '').trim().toLowerCase();
    const to = String(t.to_location ?? '').trim().toLowerCase();
    if (!amt || !from || !to) continue;
    transferNetByLocation[from] = (transferNetByLocation[from] ?? 0) - amt;
    transferNetByLocation[to] = (transferNetByLocation[to] ?? 0) + amt;
  }

  const withdrawalNetByLocation: Record<string, number> = {};
  for (const w of withdrawalRows ?? []) {
    const status = String(w.status ?? 'confirmed').trim().toLowerCase();
    if (status !== 'confirmed') continue;
    const amt = parseFloat(String(w.amount)) || 0;
    const from = String(w.from_location ?? '').trim().toLowerCase();
    if (!amt || !from) continue;
    withdrawalNetByLocation[from] = (withdrawalNetByLocation[from] ?? 0) - amt;
  }

  const locationKeys = new Set([
    ...Object.keys(locationNet),
    ...Object.keys(locationGross),
    ...Object.keys(expensesByLocation),
    ...Object.keys(transferNetByLocation),
    ...Object.keys(withdrawalNetByLocation),
  ]);

  return Array.from(locationKeys).map((location) => {
    const netAfterFees = locationNet[location] ?? 0;
    const grossTotal = locationGross[location] ?? 0;
    const allocatedExpenses = expensesByLocation[location] ?? 0;
    const transfersNet = transferNetByLocation[location] ?? 0;
    const withdrawalsNet = withdrawalNetByLocation[location] ?? 0;
    const netAfterFeesAndExpenses =
      netAfterFees - allocatedExpenses + transfersNet + withdrawalsNet;
    return {
      location,
      grossTotal,
      netAfterFees,
      allocatedExpenses,
      transfersNet,
      withdrawalsNet,
      netAfterFeesAndExpenses,
    };
  });
}

export async function getAccountingOverview(filter: OverviewPeriodFilter = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const effectiveIncomeLocation = (row: {
    payment_method?: unknown;
    money_location?: unknown;
  }): string => {
    const pm = String(row.payment_method ?? '');
    // Stripe money is locked in Stripe until a payout (transfer) moves it.
    if (pm === 'stripe') return 'stripe';
    // Cash payments land in cash.
    if (pm === 'cash') return 'cash';
    // Bank/QR settle to the bank account.
    if (pm === 'bank_transfer' || pm === 'qr_payment') return 'bank';
    // Fall back to explicit money_location for manual/other income.
    const loc = String(row.money_location ?? 'other');
    return loc || 'other';
  };

  // Income: all non-cancelled records in period (filtered by paid_date so it
  // matches expense `date` and "real income this month" is accurate).
  let incomeQuery = supabase
    .from(TABLE)
    .select('amount, income_status, money_location, payment_method, processing_fee_amount, receipt_attached');
  if (filter.dateFrom) incomeQuery = incomeQuery.gte('paid_date', filter.dateFrom.slice(0, 10));
  if (filter.dateTo)   incomeQuery = incomeQuery.lte('paid_date', filter.dateTo.slice(0, 10));
  incomeQuery = incomeQuery.neq('income_status', 'cancelled');

  // Expenses in period — payment_method (location), receipt + bill_tracking (documentation KPI).
  let expenseQuery = supabase
    .from('expenses')
    .select('amount, payment_method, receipt_attached, bill_tracking, category');
  if (filter.dateFrom) expenseQuery = expenseQuery.gte('date', filter.dateFrom?.slice(0, 10));
  if (filter.dateTo)   expenseQuery = expenseQuery.lte('date', filter.dateTo?.slice(0, 10));

  const { dateTo: ledgerBalanceThrough } = resolveCalendarYtdForOverview(filter);

  const periodTfFrom = filter.dateFrom?.slice(0, 10) ?? '0001-01-01';
  const periodTfTo = filter.dateTo?.slice(0, 10) ?? '9999-12-31';

  const [{ data: incomeRows }, { data: expenseRows }, totalRefunds, stripeRefundsInPeriod, stripeRefundsLedger] =
    await Promise.all([
      incomeQuery,
      expenseQuery,
      getRefundsTotalInPeriod(filter),
      getStripeRefundsTotalInPeriod(filter),
      getStripeRefundsTotalThroughDate(ledgerBalanceThrough),
    ]);

  const ytdFrom = `${ledgerBalanceThrough.slice(0, 4)}-01-01`;

  const [
    ledgerIncomeRows,
    ledgerExpenseRows,
    transferRows,
    ledgerTransferRows,
    withdrawalRows,
    ledgerWithdrawalRows,
    withdrawalRowsYtd,
  ] = await Promise.all([
    fetchAllLedgerIncomeRows(supabase, ledgerBalanceThrough),
    fetchAllLedgerExpenseRows(supabase, ledgerBalanceThrough),
    fetchTransfersOverlappingDateRange(supabase, periodTfFrom, periodTfTo),
    fetchTransfersThroughDate(supabase, ledgerBalanceThrough),
    fetchWithdrawalsInDateRange(supabase, periodTfFrom, periodTfTo),
    fetchWithdrawalsThroughDate(supabase, ledgerBalanceThrough),
    fetchWithdrawalsInDateRange(supabase, ytdFrom, ledgerBalanceThrough),
  ]);

  let totalIncome = 0;
  let confirmedIncome = 0;
  let stripeProcessingFees = 0;
  let confirmedIncomeNet = 0;
  /** Confirmed Stripe rows: gross card/online volume (compare to Stripe Dashboard gross). */
  let stripeConfirmedGross = 0;
  /** Confirmed Stripe rows: net after per-row processing fees (before refunds). */
  let stripeConfirmedNetBeforeRefunds = 0;
  /** Confirmed non-Stripe rows (bank, QR, cash, other / manual LINE, etc.). */
  let offStripeConfirmedGross = 0;
  let offStripeConfirmedNet = 0;
  let pendingIncome = 0;
  let incomeMissingProofCount = 0;
  let confirmedIncomeCount = 0;

  for (const row of incomeRows ?? []) {
    const gross = parseFloat(String(row.amount)) || 0;
    const pm = row.payment_method as IncomePaymentMethod;
    const feeStored = row.processing_fee_amount;
    const fee =
      feeStored != null && String(feeStored) !== ''
        ? parseFloat(String(feeStored)) || 0
        : processingFeeForIncome(gross, pm);
    totalIncome += gross;
    if (row.income_status === 'confirmed') {
      confirmedIncomeCount += 1;
      confirmedIncome += gross;
      stripeProcessingFees += fee;
      const net = netAfterProcessingFee(gross, fee);
      confirmedIncomeNet += net;
      if (pm === 'stripe') {
        stripeConfirmedGross += gross;
        stripeConfirmedNetBeforeRefunds += net;
      } else {
        offStripeConfirmedGross += gross;
        offStripeConfirmedNet += net;
      }
    } else {
      pendingIncome += gross;
    }
    if (
      !incomeDocumentationComplete({
        payment_method: row.payment_method as IncomePaymentMethod,
        receipt_attached: row.receipt_attached === true,
        income_status: row.income_status as IncomeStatus,
      })
    ) {
      incomeMissingProofCount++;
    }
  }

  let expensesMissingReceiptCount = 0;
  let cogsSubtotal = 0;
  let operatingExpensesSubtotal = 0;
  let totalExpenses = 0;
  for (const row of expenseRows ?? []) {
    const amount = parseFloat(String(row.amount)) || 0;
    totalExpenses += amount;
    const cat = String((row as { category?: unknown }).category ?? 'other');
    if (COGS_EXPENSE_CATEGORIES.has(cat)) {
      cogsSubtotal += amount;
    } else {
      operatingExpensesSubtotal += amount;
    }
    const lines = parseExpenseBillTrackingJson(row.bill_tracking);
    if (
      !expenseDocumentationComplete({
        receipt_attached: row.receipt_attached === true,
        bill_tracking: lines,
      })
    ) {
      expensesMissingReceiptCount++;
    }
  }

  const confirmedIncomeNetAfterRefunds = Math.round((confirmedIncomeNet - totalRefunds) * 100) / 100;
  const offStripeRefundsInPeriod =
    Math.round(Math.max(0, totalRefunds - stripeRefundsInPeriod) * 100) / 100;
  const stripeNetVolumeAfterRefunds =
    Math.round((stripeConfirmedNetBeforeRefunds - stripeRefundsInPeriod) * 100) / 100;
  const offStripeNetAfterRefunds = Math.round((offStripeConfirmedNet - offStripeRefundsInPeriod) * 100) / 100;
  const grossProfit = Math.round((confirmedIncomeNetAfterRefunds - cogsSubtotal) * 100) / 100;
  const netResult = Math.round((confirmedIncomeNetAfterRefunds - totalExpenses) * 100) / 100;

  const incomeByLocation = buildIncomeByLocationBreakdown(
    incomeRows,
    expenseRows,
    transferRows,
    withdrawalRows,
    effectiveIncomeLocation
  );
  const incomeByLocationLedger = normalizeLedgerLocationTotals(
    buildIncomeByLocationBreakdown(
      ledgerIncomeRows,
      ledgerExpenseRows,
      ledgerTransferRows,
      ledgerWithdrawalRows,
      effectiveIncomeLocation,
      { stripeRefundsTotal: stripeRefundsLedger, ledgerIncludePendingManualIncome: true }
    )
  );

  let withdrawalsInPeriod = 0;
  let withdrawalsCount = 0;
  for (const w of withdrawalRows) {
    if (String(w.status ?? 'confirmed').trim().toLowerCase() !== 'confirmed') continue;
    withdrawalsInPeriod += parseFloat(String(w.amount)) || 0;
    withdrawalsCount += 1;
  }
  withdrawalsInPeriod = Math.round(withdrawalsInPeriod * 100) / 100;

  let withdrawalsYtd = 0;
  for (const w of withdrawalRowsYtd) {
    if (String(w.status ?? 'confirmed').trim().toLowerCase() !== 'confirmed') continue;
    withdrawalsYtd += parseFloat(String(w.amount)) || 0;
  }
  withdrawalsYtd = Math.round(withdrawalsYtd * 100) / 100;

  const ledgerRecentMovements = buildLedgerRecentMovementsPerLocation({
    ledgerIncomeRows: ledgerIncomeRows ?? [],
    ledgerExpenseRows: ledgerExpenseRows ?? [],
    ledgerTransferRows: ledgerTransferRows ?? [],
    ledgerWithdrawalRows: ledgerWithdrawalRows ?? [],
    effectiveIncomeLocation,
    ledgerIncludePendingManualIncome: true,
  });

  return {
    totalIncome,
    confirmedIncome,
    stripeProcessingFees,
    confirmedIncomeNet,
    stripeConfirmedGross,
    stripeConfirmedNetBeforeRefunds,
    stripeNetVolumeAfterRefunds,
    stripeRefundsInPeriod,
    offStripeConfirmedGross,
    offStripeConfirmedNet,
    offStripeRefundsInPeriod,
    offStripeNetAfterRefunds,
    totalRefunds,
    confirmedIncomeNetAfterRefunds,
    cogsSubtotal,
    operatingExpensesSubtotal,
    grossProfit,
    pendingIncome,
    totalExpenses,
    netResult,
    incomeByLocation,
    incomeByLocationLedger,
    ledgerRecentMovements,
    ledgerBalanceThrough,
    incomeCount: (incomeRows ?? []).length,
    confirmedIncomeCount,
    expenseCount: (expenseRows ?? []).length,
    transfersCount: (transferRows ?? []).length,
    withdrawalsInPeriod,
    withdrawalsCount,
    withdrawalsYtd,
    expensesMissingReceiptCount,
    incomeMissingProofCount,
    currency: 'THB',
  };
}
