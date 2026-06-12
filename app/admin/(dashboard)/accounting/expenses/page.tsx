import { getExpenses } from '@/lib/expenses/expenseQueries';
import type { DocumentationFilter, ReceiptFilter } from '@/types/expenses';
import { buildAccountingPeriodLabel, resolveAccountingPeriod } from '../accounting-period';
import { AccountingShellClient } from '../AccountingShellClient';
import { AccountingExpensesPanel } from '../AccountingExpensesPanel';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    period?: string;
    category?: string;
    payment_method?: string;
    receipt?: string;
    documentation?: string;
    page?: string;
  }>;
}

function isReceiptFilter(v: string | undefined): v is ReceiptFilter {
  return v === 'missing' || v === 'attached' || v === 'all';
}

function documentationFilterFromParam(v: string | undefined): DocumentationFilter | undefined {
  return v === 'incomplete' || v === 'complete' ? v : undefined;
}

export default async function AccountingExpensesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userAskedAllTime, noExplicitPeriod, effectivePeriod } = resolveAccountingPeriod(params);
  const expensePage = Math.max(1, parseInt(params.page ?? '1', 10));
  const expensePageSize = 30;

  const receiptFilter: ReceiptFilter | undefined = isReceiptFilter(params.receipt) ? params.receipt : undefined;
  const documentationFilter = documentationFilterFromParam(params.documentation);

  const expenseFilters = {
    dateFrom: effectivePeriod.dateFrom,
    dateTo: effectivePeriod.dateTo,
    category: params.category,
    payment_method: params.payment_method,
    receipt: receiptFilter,
    documentation: documentationFilter,
  };

  const expensesData = await getExpenses(expenseFilters, { page: expensePage, pageSize: expensePageSize });
  const periodLabel = buildAccountingPeriodLabel(effectivePeriod, {
    userAskedAllTime,
    noExplicitPeriod,
  });

  const navCounts = { expenses: expensesData.total };

  return (
    <AccountingShellClient
      periodLabel={periodLabel}
      initialDateFrom={effectivePeriod.dateFrom}
      initialDateTo={effectivePeriod.dateTo}
      isAllTime={userAskedAllTime}
      navCounts={navCounts}
    >
      <AccountingExpensesPanel
        expensesData={expensesData}
        expensesPage={expensePage}
        expensesPageSize={expensePageSize}
        expensesFilters={expenseFilters}
        periodLabel={periodLabel}
      />
    </AccountingShellClient>
  );
}
