import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  netAfterProcessingFee,
  processingFeeForIncome,
} from '@/lib/accounting/stripeFee';
import type { IncomePaymentMethod, IncomeRecord } from '@/types/accounting';
import { INCOME_SOURCE_TYPES, MONEY_LOCATIONS } from '@/types/accounting';
import type { Expense } from '@/types/expenses';
import { EXPENSE_CATEGORIES } from '@/types/expenses';
import type { AccountingTransfer } from '@/types/accountingTransfers';
import { getAccountingTransfers } from '@/lib/accounting/transfers';
import type {
  LedgerLocationBreakdown,
  LedgerPeriodFilter,
  LedgerResult,
  LedgerRow,
} from '@/types/ledger';

const INCOME_CAT_LABEL = Object.fromEntries(
  INCOME_SOURCE_TYPES.map((x) => [x.value, x.label])
);
const EXPENSE_CAT_LABEL = Object.fromEntries(
  EXPENSE_CATEGORIES.map((x) => [x.value, x.label])
);
const MONEY_LOC_LABEL = Object.fromEntries(
  MONEY_LOCATIONS.map((x) => [x.value, x.label])
);

function feeForIncomeRow(r: IncomeRecord): number {
  const gross = Number(r.amount) || 0;
  const raw = r.processing_fee_amount;
  if (raw != null && String(raw) !== '') return parseFloat(String(raw)) || 0;
  return processingFeeForIncome(gross, r.payment_method as IncomePaymentMethod);
}

/** Balance delta: confirmed = net; pending = gross */
export function ledgerIncomeDelta(r: IncomeRecord): number {
  if (r.income_status === 'cancelled') return 0;
  const gross = Number(r.amount) || 0;
  const fee = feeForIncomeRow(r);
  if (r.income_status === 'confirmed') {
    return netAfterProcessingFee(gross, fee);
  }
  if (r.income_status === 'pending') return gross;
  return 0;
}

function incomeAmountInDisplay(r: IncomeRecord): number {
  return ledgerIncomeDelta(r);
}

function paymentMethodLabelIncome(pm: string): string {
  const map: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank transfer',
    stripe: 'Stripe',
    qr_payment: 'QR',
    other: 'Other',
  };
  return map[pm] ?? pm;
}

function paymentMethodLabelExpense(pm: string): string {
  const map: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank transfer',
    card: 'Card',
    qr_payment: 'QR',
    other: 'Other',
  };
  return map[pm] ?? pm;
}

function incomeMatchesPeriod(r: IncomeRecord, f: LedgerPeriodFilter): boolean {
  const t = new Date(r.created_at).getTime();
  if (f.dateFrom && t < Date.parse(f.dateFrom + 'T00:00:00.000Z')) return false;
  if (f.dateTo && t > Date.parse(f.dateTo + 'T23:59:59.999Z')) return false;
  return true;
}

function expenseMatchesPeriod(e: Expense, f: LedgerPeriodFilter): boolean {
  const d = e.date.slice(0, 10);
  if (f.dateFrom && d < f.dateFrom.slice(0, 10)) return false;
  if (f.dateTo && d > f.dateTo.slice(0, 10)) return false;
  return true;
}

function incomeBeforePeriod(r: IncomeRecord, f: LedgerPeriodFilter): boolean {
  if (!f.dateFrom) return false;
  return new Date(r.created_at).getTime() < Date.parse(f.dateFrom + 'T00:00:00.000Z');
}

function expenseBeforePeriod(e: Expense, f: LedgerPeriodFilter): boolean {
  if (!f.dateFrom) return false;
  return e.date.slice(0, 10) < f.dateFrom.slice(0, 10);
}

function toIncomeLedgerRow(
  r: IncomeRecord,
  runningBalance: number,
  sortIso: string
): LedgerRow {
  const loc = MONEY_LOC_LABEL[r.money_location] ?? r.money_location;
  const pm = paymentMethodLabelIncome(r.payment_method);
  const gross = Number(r.amount) || 0;
  const fee = feeForIncomeRow(r);
  const desc =
    r.income_status === 'confirmed' && r.payment_method === 'stripe' && fee > 0
      ? `${r.description} (gross ${gross.toFixed(2)}, fee ${fee.toFixed(2)})`
      : r.description;

  return {
    id: r.id,
    kind: 'income',
    sortIso,
    displayDate: r.created_at.slice(0, 10),
    transactionType: 'income',
    category: INCOME_CAT_LABEL[r.source_type] ?? r.source_type,
    description: desc,
    sourceAccount: `${loc} · ${pm}`,
    amountIn: incomeAmountInDisplay(r),
    amountOut: null,
    delta: ledgerIncomeDelta(r),
    runningBalance,
    referenceId: r.order_id,
    createdBy: r.created_by,
    status: r.income_status,
    currency: r.currency || 'THB',
    detailHref: `/admin/accounting/income/${r.id}`,
  };
}

function toExpenseLedgerRow(
  e: Expense,
  runningBalance: number,
  sortIso: string
): LedgerRow {
  const amt = Number(e.amount) || 0;
  const pm = paymentMethodLabelExpense(e.payment_method);
  return {
    id: e.id,
    kind: 'expense',
    sortIso,
    displayDate: e.date.slice(0, 10),
    transactionType: 'expense',
    category: EXPENSE_CAT_LABEL[e.category] ?? e.category,
    description: e.description,
    sourceAccount: `Expense · ${pm}`,
    amountIn: null,
    amountOut: amt,
    delta: -amt,
    runningBalance,
    referenceId: e.linked_order_id,
    createdBy: e.created_by,
    status: null,
    currency: e.currency || 'THB',
    detailHref: `/admin/expenses/${e.id}`,
  };
}

function toTransferLedgerRow(
  t: AccountingTransfer,
  runningBalance: number,
  sortIso: string
): LedgerRow {
  const from = MONEY_LOC_LABEL[t.from_location] ?? t.from_location;
  const to = MONEY_LOC_LABEL[t.to_location] ?? t.to_location;
  const note = t.note ? ` · ${t.note}` : '';
  const ref = t.external_reference ? ` · Ref ${t.external_reference}` : '';
  return {
    id: t.id,
    kind: 'transfer',
    sortIso,
    displayDate: t.transfer_date.slice(0, 10),
    transactionType: 'transfer',
    category: 'Transfer',
    description: `${from} → ${to}${ref}${note}`,
    sourceAccount: `${from} → ${to}`,
    amountIn: null,
    amountOut: null,
    delta: 0,
    runningBalance,
    referenceId: t.external_reference,
    createdBy: t.created_by,
    status: t.status,
    currency: t.currency || 'THB',
    detailHref: '/admin/accounting', // no detail page yet
  };
}

export async function getLedgerEntries(
  filter: LedgerPeriodFilter = {}
): Promise<LedgerResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      openingBalance: 0,
      rows: [],
      periodTotals: {
        totalIncome: 0,
        totalExpenses: 0,
        net: 0,
        endingBalance: 0,
      },
      incomeByLocation: [],
      error: 'Supabase not configured',
    };
  }

  const [
    { data: incomeData, error: incomeErr },
    { data: expenseData, error: expErr },
    transferResult,
  ] = await Promise.all([
    supabase.from('income_records').select('*').neq('income_status', 'cancelled'),
    supabase.from('expenses').select('*'),
    getAccountingTransfers(filter),
  ]);

  if (incomeErr || expErr || transferResult.error) {
    const msg =
      incomeErr?.message || expErr?.message || transferResult.error || 'Query failed';
    console.error('[ledger]', msg);
    return {
      openingBalance: 0,
      rows: [],
      periodTotals: {
        totalIncome: 0,
        totalExpenses: 0,
        net: 0,
        endingBalance: 0,
      },
      incomeByLocation: [],
      error: msg,
    };
  }

  const incomes = (incomeData ?? []) as IncomeRecord[];
  const expenses = (expenseData ?? []) as Expense[];
  const transfers = (transferResult.transfers ?? []) as AccountingTransfer[];

  const hasPeriod = Boolean(filter.dateFrom || filter.dateTo);

  let openingBalance = 0;
  if (hasPeriod && filter.dateFrom) {
    for (const r of incomes) {
      if (incomeBeforePeriod(r, filter)) openingBalance += ledgerIncomeDelta(r);
    }
    for (const e of expenses) {
      if (expenseBeforePeriod(e, filter)) {
        openingBalance -= Number(e.amount) || 0;
      }
    }
  }

  type Raw = {
    type: 'income' | 'expense' | 'transfer';
    sortMs: number;
    sortIso: string;
    income?: IncomeRecord;
    expense?: Expense;
    transfer?: AccountingTransfer;
  };
  const raw: Raw[] = [];

  for (const r of incomes) {
    if (!hasPeriod || incomeMatchesPeriod(r, filter)) {
      const sortIso = r.created_at;
      raw.push({
        type: 'income',
        sortMs: new Date(r.created_at).getTime(),
        sortIso,
        income: r,
      });
    }
  }
  for (const e of expenses) {
    if (!hasPeriod || expenseMatchesPeriod(e, filter)) {
      const sortIso = e.created_at;
      raw.push({
        type: 'expense',
        sortMs: new Date(e.created_at).getTime(),
        sortIso,
        expense: e,
      });
    }
  }
  for (const t of transfers) {
    // Use transfer_date for filtering but created_at for sort stability.
    const sortIso = t.created_at;
    raw.push({
      type: 'transfer',
      sortMs: new Date(t.created_at).getTime(),
      sortIso,
      transfer: t,
    });
  }

  raw.sort((a, b) => {
    if (a.sortMs !== b.sortMs) return a.sortMs - b.sortMs;
    return a.sortIso.localeCompare(b.sortIso);
  });

  let balance = openingBalance;
  const rows: LedgerRow[] = [];

  for (const item of raw) {
    if (item.type === 'income' && item.income) {
      const r = item.income;
      balance += ledgerIncomeDelta(r);
      rows.push(toIncomeLedgerRow(r, balance, item.sortIso));
    } else if (item.type === 'expense' && item.expense) {
      const e = item.expense;
      const amt = Number(e.amount) || 0;
      balance -= amt;
      rows.push(toExpenseLedgerRow(e, balance, item.sortIso));
    } else if (item.type === 'transfer' && item.transfer) {
      rows.push(toTransferLedgerRow(item.transfer, balance, item.sortIso));
    }
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  const locMap: Record<string, number> = {};

  for (const item of raw) {
    if (item.type === 'income' && item.income) {
      const r = item.income;
      const delta = ledgerIncomeDelta(r);
      totalIncome += delta;
      if (r.income_status === 'confirmed') {
        const gross = Number(r.amount) || 0;
        const loc = String(r.money_location ?? 'other');
        locMap[loc] = (locMap[loc] ?? 0) + gross;
      }
    } else if (item.type === 'expense' && item.expense) {
      totalExpenses += Number(item.expense.amount) || 0;
    }
  }

  const endingBalance = balance;
  const incomeByLocation: LedgerLocationBreakdown[] = Object.entries(locMap).map(
    ([location, total]) => ({
      location,
      label: MONEY_LOC_LABEL[location] ?? location,
      total,
    })
  );

  return {
    openingBalance,
    rows,
    periodTotals: {
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
      endingBalance,
    },
    incomeByLocation,
  };
}
