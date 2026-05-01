import { getLedgerEntries } from '@/lib/accounting/ledger';
import { getAccountingOverview, getIncomeRecords } from '@/lib/accounting/incomeRecords';
import { getAccountingTransfers } from '@/lib/accounting/transfers';
import { getExpenses } from '@/lib/expenses/expenseQueries';
import type { ReceiptFilter } from '@/types/expenses';
import { AccountingOverviewClient } from './AccountingOverviewClient';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    tab?: string;
    category?: string;
    payment_method?: string;
    source_mode?: string;
    source_type?: string;
    income_status?: string;
    receipt?: string;
    period?: string;
    page?: string;
  }>;
}

/** Returns YYYY-MM-DD pair for the first/last day of the current calendar month (local time). */
function currentMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dateFrom: fmt(first), dateTo: fmt(last) };
}

function isReceiptFilter(v: string | undefined): v is ReceiptFilter {
  return v === 'missing' || v === 'attached' || v === 'all';
}

export default async function AdminAccountingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab =
    params.tab === 'expenses' ? 'expenses' :
    params.tab === 'ledger'   ? 'ledger'   :
    params.tab === 'transfers' ? 'transfers' :
    params.tab === 'income'   ? 'income'   : 'overview';

  // Default to current month when no explicit period is set AND the user hasn't asked
  // for "all time" via period=all. This keeps "How much we made this month" always 1 click away.
  const userAskedAllTime = params.period === 'all';
  const noExplicitPeriod = !params.dateFrom && !params.dateTo;
  const effectivePeriod =
    noExplicitPeriod && !userAskedAllTime
      ? currentMonthRange()
      : { dateFrom: params.dateFrom, dateTo: params.dateTo };

  const expensePage = Math.max(1, parseInt(params.page ?? '1', 10));
  const expensePageSize = 30;
  const incomePage = Math.max(1, parseInt(params.page ?? '1', 10));
  const incomePageSize = 30;

  const receiptFilter: ReceiptFilter | undefined = isReceiptFilter(params.receipt)
    ? params.receipt
    : undefined;

  const expenseFilters = {
    dateFrom:       effectivePeriod.dateFrom,
    dateTo:         effectivePeriod.dateTo,
    category:       params.category,
    payment_method: params.payment_method,
    receipt:        receiptFilter,
  };

  const incomeFilters = {
    dateFrom:      effectivePeriod.dateFrom,
    dateTo:        effectivePeriod.dateTo,
    source_mode:   params.source_mode,
    source_type:   params.source_type,
    income_status: params.income_status,
    receipt:       receiptFilter,
  };

  const period = { dateFrom: effectivePeriod.dateFrom, dateTo: effectivePeriod.dateTo };

  const [overview, expensesData, ledger, incomeData, transfersData] = await Promise.all([
    getAccountingOverview(period),
    getExpenses(expenseFilters, { page: expensePage, pageSize: expensePageSize }),
    getLedgerEntries(period),
    getIncomeRecords(incomeFilters, { page: incomePage, pageSize: incomePageSize }),
    getAccountingTransfers(period),
  ]);

  const periodLabel = (() => {
    if (userAskedAllTime) return 'All time';
    const { dateFrom, dateTo } = effectivePeriod;
    if (dateFrom && dateTo) {
      // If both bounds match a single calendar month, show a friendly label.
      const fStart = new Date(dateFrom + 'T12:00:00');
      const fEnd = new Date(dateTo + 'T12:00:00');
      const sameMonth =
        fStart.getFullYear() === fEnd.getFullYear() &&
        fStart.getMonth() === fEnd.getMonth() &&
        fStart.getDate() === 1 &&
        fEnd.getDate() === new Date(fEnd.getFullYear(), fEnd.getMonth() + 1, 0).getDate();
      if (sameMonth) {
        return `${fStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}${
          noExplicitPeriod ? ' (this month)' : ''
        }`;
      }
      return `${dateFrom} → ${dateTo}`;
    }
    if (dateFrom) return `From ${dateFrom}`;
    if (dateTo)   return `Until ${dateTo}`;
    return 'All time';
  })();

  return (
    <AccountingOverviewClient
      overview={overview}
      ledger={ledger}
      periodLabel={periodLabel}
      initialDateFrom={effectivePeriod.dateFrom}
      initialDateTo={effectivePeriod.dateTo}
      isAllTime={userAskedAllTime}
      activeTab={activeTab}
      expensesData={expensesData}
      expensesPage={expensePage}
      expensesPageSize={expensePageSize}
      expensesFilters={expenseFilters}
      incomeData={incomeData}
      incomePage={incomePage}
      incomePageSize={incomePageSize}
      incomeFilters={incomeFilters}
      transfersData={transfersData}
    />
  );
}
