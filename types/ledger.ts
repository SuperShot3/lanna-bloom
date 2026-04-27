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

export interface LedgerResult {
  openingBalance: number;
  rows: LedgerRow[];
  periodTotals: LedgerPeriodTotals;
  /** Income by money_location for rows in period (gross, confirmed only) */
  incomeByLocation: LedgerLocationBreakdown[];
  error?: string;
}

export interface LedgerPeriodFilter {
  dateFrom?: string;
  dateTo?: string;
}
