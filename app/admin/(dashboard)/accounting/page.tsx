import { getLedgerEntries } from '@/lib/accounting/ledger';
import { getAccountingOverview } from '@/lib/accounting/incomeRecords';
import { getExpenses } from '@/lib/expenses/expenseQueries';
import { AccountingOverviewClient } from './AccountingOverviewClient';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    tab?: string;
    category?: string;
    payment_method?: string;
    page?: string;
  }>;
}

export default async function AdminAccountingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab =
    params.tab === 'expenses' ? 'expenses' :
    params.tab === 'ledger'   ? 'ledger'   : 'overview';
  const expensePage = Math.max(1, parseInt(params.page ?? '1', 10));
  const expensePageSize = 30;

  const expenseFilters = {
    dateFrom:       params.dateFrom,
    dateTo:         params.dateTo,
    category:       params.category,
    payment_method: params.payment_method,
  };

  // Always load expenses with overview so the Expenses tab has data on first paint after tab switch
  // (conditional fetch left expensesData null and relied on RSC refetch, which often felt stale).
  const period = { dateFrom: params.dateFrom, dateTo: params.dateTo };

  const [overview, expensesData, ledger] = await Promise.all([
    getAccountingOverview(period),
    getExpenses(expenseFilters, { page: expensePage, pageSize: expensePageSize }),
    getLedgerEntries(period),
  ]);

  const periodLabel =
    params.dateFrom && params.dateTo ? `${params.dateFrom} → ${params.dateTo}`
    : params.dateFrom ? `From ${params.dateFrom}`
    : params.dateTo   ? `Until ${params.dateTo}`
    : 'All time';

  return (
    <AccountingOverviewClient
      overview={overview}
      ledger={ledger}
      periodLabel={periodLabel}
      initialDateFrom={params.dateFrom}
      initialDateTo={params.dateTo}
      activeTab={activeTab}
      expensesData={expensesData}
      expensesPage={expensePage}
      expensesPageSize={expensePageSize}
      expensesFilters={expenseFilters}
    />
  );
}
