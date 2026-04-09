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
}

// ─── Filter + pagination ──────────────────────────────────────────────────────

export interface IncomeFilters {
  dateFrom?: string;
  dateTo?: string;
  source_mode?: string;
  source_type?: string;
  income_status?: string;
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
  /** netAfterFees − allocatedExpenses + transfersNet */
  netAfterFeesAndExpenses: number;
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
  incomeCount: number;
  expenseCount: number;
  currency: string;
}
