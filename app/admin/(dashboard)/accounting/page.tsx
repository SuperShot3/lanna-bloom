import { getLedgerEntries } from '@/lib/accounting/ledger';
import { getAccountingOverview, getIncomeRecords } from '@/lib/accounting/incomeRecords';
import { getExpenses } from '@/lib/expenses/expenseQueries';
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
    page?: string;
  }>;
}

export default async function AdminAccountingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab =
    params.tab === 'expenses' ? 'expenses' :
    params.tab === 'ledger'   ? 'ledger'   :
    params.tab === 'income'   ? 'income'   : 'overview';
  const expensePage = Math.max(1, parseInt(params.page ?? '1', 10));
  const expensePageSize = 30;
  const incomePage = Math.max(1, parseInt(params.page ?? '1', 10));
  const incomePageSize = 30;

  const expenseFilters = {
    dateFrom:       params.dateFrom,
    dateTo:         params.dateTo,
    category:       params.category,
    payment_method: params.payment_method,
  };

  const incomeFilters = {
    dateFrom:      params.dateFrom,
    dateTo:        params.dateTo,
    source_mode:   params.source_mode,
    source_type:   params.source_type,
    income_status: params.income_status,
  };

  const period = { dateFrom: params.dateFrom, dateTo: params.dateTo };

  const [overview, expensesData, ledger, incomeData] = await Promise.all([
    getAccountingOverview(period),
    getExpenses(expenseFilters, { page: expensePage, pageSize: expensePageSize }),
    getLedgerEntries(period),
    getIncomeRecords(incomeFilters, { page: incomePage, pageSize: incomePageSize }),
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
      incomeData={incomeData}
      incomePage={incomePage}
      incomePageSize={incomePageSize}
      incomeFilters={incomeFilters}
    />
  );
}
