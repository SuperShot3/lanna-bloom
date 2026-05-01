/**
 * Unified accounting ledger row (income + expenses) for the admin Overview register.
 */

export type LedgerKind = 'income' | 'expense' | 'transfer';

export interface LedgerRow {
  id: string;
  kind: LedgerKind;
  /** ISO timestamp used for sorting */
  sortIso: string;
  /** YYYY-MM-DD or short display date */
  displayDate: string;
  transactionType: 'income' | 'expense' | 'transfer';
  category: string;
  description: string;
  sourceAccount: string;
  /** Confirmed income: net after fees; pending: gross */
  amountIn: number | null;
  amountOut: number | null;
  /** Effect on running balance (+ in, − out) */
  delta: number;
  runningBalance: number;
  referenceId: string | null;
  createdBy: string;
  status: string | null;
  currency: string;
  detailHref: string;
  /**
   * Whether the row has a paper bill / proof file attached.
   * - income: `proof_file_path` present
   * - expense: `receipt_attached`
   * - transfer: `attachment_attached`
   * - null when not applicable (legacy rows without the field).
   */
  receiptAttached: boolean | null;
  /** Raw enum values used for grouping/filtering in the UI. */
  rawCategory: string;
  rawPaymentMethod: string | null;
}

export interface LedgerPeriodTotals {
  totalIncome: number;
  totalExpenses: number;
  net: number;
  endingBalance: number;
}

export interface LedgerLocationBreakdown {
  location: string;
  label: string;
  total: number;
}

/** A calendar-month grouping of ledger rows for the multi-month "All time" view. */
export interface LedgerMonthlyGroup {
  /** YYYY-MM key, used as React key and for sorting (desc). */
  ym: string;
  /** Display label, e.g. "April 2026". */
  label: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  /** Row IDs in this month — keep ledger row data in `rows` to avoid duplication. */
  rowIds: string[];
}

/** Per-category subtotal for the expense sub-view footer. */
export interface LedgerCategoryBreakdown {
  category: string;
  label: string;
  total: number;
  count: number;
}

/** Per payment-method subtotal for the income sub-view footer. */
export interface LedgerPaymentMethodBreakdown {
  paymentMethod: string;
  label: string;
  total: number;
  count: number;
}

export interface LedgerResult {
  openingBalance: number;
  rows: LedgerRow[];
  periodTotals: LedgerPeriodTotals;
  /** Income by money_location for rows in period (gross, confirmed only) */
  incomeByLocation: LedgerLocationBreakdown[];
  /** Sorted desc by `ym`. Empty array when the period spans a single calendar month. */
  monthlyGroups: LedgerMonthlyGroup[];
  /** Sorted desc by total. Used by the Expenses sub-view footer. */
  expensesByCategory: LedgerCategoryBreakdown[];
  /** Sorted desc by total. Used by the Income sub-view footer. */
  incomeByPaymentMethod: LedgerPaymentMethodBreakdown[];
  /** Convenience counts for sub-tab badges + missing-bill indicator. */
  counts: {
    income: number;
    expense: number;
    transfer: number;
    missingReceipts: number;
  };
  error?: string;
}

export interface LedgerPeriodFilter {
  dateFrom?: string;
  dateTo?: string;
}
