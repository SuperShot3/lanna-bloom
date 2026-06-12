import { getAccountingOverview, getIncomeRecords } from '@/lib/accounting/incomeRecords';
import type { IncomeFilters } from '@/types/accounting';
import { buildAccountingPeriodLabel, resolveAccountingPeriod } from '../accounting-period';
import { AccountingIncomeRecordsPanel } from '../AccountingIncomeRecordsPanel';
import { AccountingShellClient } from '../AccountingShellClient';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    period?: string;
    source_mode?: string;
    source_type?: string;
    income_status?: string;
    receipt?: string;
    page?: string;
  }>;
}

function isReceiptFilter(v: string | undefined): v is 'all' | 'missing' | 'attached' {
  return v === 'missing' || v === 'attached' || v === 'all';
}

export default async function AdminIncomeListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userAskedAllTime, noExplicitPeriod, effectivePeriod } = resolveAccountingPeriod(params);

  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const pageSize = 30;

  const incomeFilters: IncomeFilters = {
    dateFrom: effectivePeriod.dateFrom,
    dateTo: effectivePeriod.dateTo,
    source_mode: params.source_mode,
    source_type: params.source_type,
    income_status: params.income_status,
    receipt: isReceiptFilter(params.receipt) ? params.receipt : undefined,
  };

  const overviewPeriod = { dateFrom: effectivePeriod.dateFrom, dateTo: effectivePeriod.dateTo };

  const [result, overview] = await Promise.all([
    getIncomeRecords(incomeFilters, { page, pageSize }),
    getAccountingOverview(overviewPeriod),
  ]);

  const periodLabel = buildAccountingPeriodLabel(effectivePeriod, {
    userAskedAllTime,
    noExplicitPeriod,
  });

  const navCounts = { income: result.total };

  return (
    <AccountingShellClient
      periodLabel={periodLabel}
      initialDateFrom={effectivePeriod.dateFrom}
      initialDateTo={effectivePeriod.dateTo}
      isAllTime={userAskedAllTime}
      navCounts={navCounts}
    >
      <AccountingIncomeRecordsPanel
        incomeData={result}
        incomePage={page}
        incomePageSize={pageSize}
        incomeFilters={incomeFilters}
        periodLabel={periodLabel}
        periodNetProfit={overview?.netResult ?? null}
      />
    </AccountingShellClient>
  );
}
