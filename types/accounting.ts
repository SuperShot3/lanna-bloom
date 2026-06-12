// ─── Income Records ──────────────────────────────────────────────────────────

export type IncomeSourceMode = 'auto_order' | 'manual';

export type IncomeSourceType =
  | 'order'
  | 'legacy_order'
  | 'offline_sale'
  | 'adjustment';

export type IncomePaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'stripe'
  | 'qr_payment'
  | 'other';

export type MoneyLocation = 'bank' | 'cash' | 'stripe' | 'other';

export type IncomeStatus = 'confirmed' | 'pending' | 'cancelled';

export interface IncomeRecord {
  id: string;
  order_id: string | null;
  source_mode: IncomeSourceMode;
  source_type: IncomeSourceType;
  /** Gross amount (customer payment) in `currency`. */
  amount: number;
  /** Stripe/card: 5.3% of `amount`; otherwise 0. Omitted on legacy rows until backfilled. */
  processing_fee_amount?: number;
  currency: string;
  payment_method: IncomePaymentMethod;
  money_location: MoneyLocation;
  income_status: IncomeStatus;
  description: string;
  external_reference: string | null;
  proof_file_path: string | null;
  receipt_attached: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  /**
   * The business day the money actually arrived (YYYY-MM-DD). Defaults to
   * insertion day on the database side. Used as the canonical "income date"
   * for monthly reports so it lines up with expense `date`.
   */
  paid_date: string;
}

// ─── Filter + pagination ──────────────────────────────────────────────────────

export interface IncomeFilters {
  dateFrom?: string;
  dateTo?: string;
  source_mode?: string;
  source_type?: string;
  income_status?: string;
  /**
   * `missing`  → non-Stripe rows still missing an uploaded proof (Stripe uses dashboard receipts)
   * `attached` → Stripe **or** proof file uploaded
   * `all` / undefined → no filter
   */
  receipt?: 'all' | 'missing' | 'attached';
}

/**
 * Whether income is considered fully documented for compliance KPIs and the ledger.
 * Stripe card/online: no upload required (official record in Stripe).
 * Other payment methods: require `receipt_attached` / proof file.
 * Cancelled rows are treated as complete (not counted as gaps).
 */
export function incomeDocumentationComplete(
  r: Pick<IncomeRecord, 'payment_method' | 'receipt_attached' | 'income_status'>
): boolean {
  if (r.income_status === 'cancelled') return true;
  if (r.payment_method === 'stripe') return true;
  return r.receipt_attached === true;
}

// ─── UI constants ─────────────────────────────────────────────────────────────

export const INCOME_SOURCE_TYPES: { value: IncomeSourceType; label: string }[] = [
  { value: 'order',        label: 'Order (in system)' },
  { value: 'legacy_order', label: 'Legacy Order' },
  { value: 'offline_sale', label: 'Offline Sale' },
  { value: 'adjustment',   label: 'Adjustment' },
];

export const INCOME_PAYMENT_METHODS: { value: IncomePaymentMethod; label: string }[] = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'stripe',        label: 'Stripe (Card/Online)' },
  { value: 'qr_payment',    label: 'QR Payment' },
  { value: 'other',         label: 'Other' },
];

export const MONEY_LOCATIONS: { value: MoneyLocation; label: string }[] = [
  { value: 'bank',   label: 'Bank Account' },
  { value: 'cash',   label: 'Cash on Hand' },
  { value: 'stripe', label: 'Stripe Balance' },
  { value: 'other',  label: 'Other' },
];

export const INCOME_STATUSES: { value: IncomeStatus; label: string }[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending',   label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ─── Accounting overview ──────────────────────────────────────────────────────

export interface MoneyLocationTotal {
  location: string;
  /** Gross confirmed income recorded in this money location */
  grossTotal: number;
  /** Confirmed income net of Stripe fees for this location */
  netAfterFees: number;
  /** Expenses allocated to this location */
  allocatedExpenses: number;
  /** Net effect of transfers into/out of this location */
  transfersNet?: number;
  /** Net effect of owner withdrawals from this location (always ≤ 0) */
  withdrawalsNet?: number;
  /** netAfterFees − allocatedExpenses + transfersNet + withdrawalsNet */
  netAfterFeesAndExpenses: number;
}

export type LedgerMovementKind = 'income' | 'expense' | 'transfer' | 'withdrawal';

/** Ledger timeline row for overview “recent movements” hints (sorted newest-first elsewhere). */
export interface LedgerChannelMoneyMovement {
  /** YYYY-MM-DD — business/booking date of the movement */
  occurredOn: string;
  /** Detail line without the kind prefix (kind is separate for layout) */
  summary: string;
  /** Effect on this location (+ money in, − out) */
  delta: number;
  kind: LedgerMovementKind;
}

export interface AccountingOverview {
  periodLabel: string;
  totalIncome: number;
  /** Sum of confirmed gross amounts (all payment methods). */
  confirmedIncome: number;
  /** Sum of processing fees on confirmed Stripe rows (5.3% of gross each). */
  stripeProcessingFees: number;
  /** Confirmed income minus Stripe processing fees (realistic revenue before expenses). */
  confirmedIncomeNet: number;
  pendingIncome: number;
  totalExpenses: number;
  /** `confirmedIncomeNet - totalExpenses` */
  netResult: number;
  incomeByLocation: MoneyLocationTotal[];
  /** Cumulative channel breakdown through `ledgerBalanceThrough` (see overview UI). */
  incomeByLocationLedger: MoneyLocationTotal[];
  /** Latest ledger cashflow lines per bucket (income · expense legs · transfers; refunds aggregate excluded). */
  ledgerRecentMovements: Record<string, LedgerChannelMoneyMovement[]>;
  /** Upper bound (YYYY-MM-DD) for cumulative “where the money is”; capped at today. */
  ledgerBalanceThrough: string;
  incomeCount: number;
  expenseCount: number;
  currency: string;
}
