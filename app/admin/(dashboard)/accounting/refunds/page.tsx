import { getIncomeRefunds } from '@/lib/accounting/incomeRefunds';
import { buildAccountingPeriodLabel, resolveAccountingPeriod } from '../accounting-period';
import { AccountingShellClient } from '../AccountingShellClient';
import { AccountingRefundsPanel } from '../AccountingRefundsPanel';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    period?: string;
    page?: string;
  }>;
}

export default async function AccountingRefundsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userAskedAllTime, noExplicitPeriod, effectivePeriod } = resolveAccountingPeriod(params);
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const pageSize = 30;

  const refundsData = await getIncomeRefunds(
    { dateFrom: effectivePeriod.dateFrom, dateTo: effectivePeriod.dateTo },
    { page, pageSize }
  );
  const periodLabel = buildAccountingPeriodLabel(effectivePeriod, {
    userAskedAllTime,
    noExplicitPeriod,
  });

  return (
    <AccountingShellClient
      periodLabel={periodLabel}
      initialDateFrom={effectivePeriod.dateFrom}
      initialDateTo={effectivePeriod.dateTo}
      isAllTime={userAskedAllTime}
      navCounts={{ refunds: refundsData.total }}
    >
      <AccountingRefundsPanel
        refundsData={refundsData}
        page={page}
        pageSize={pageSize}
        periodLabel={periodLabel}
      />
    </AccountingShellClient>
  );
}
