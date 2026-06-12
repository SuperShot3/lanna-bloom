import { getAccountingWithdrawals, sumWithdrawalsInRange } from '@/lib/accounting/withdrawals';
import { buildAccountingPeriodLabel, resolveAccountingPeriod } from '../accounting-period';
import { AccountingShellClient } from '../AccountingShellClient';
import { AccountingWithdrawalsPanel } from '../AccountingWithdrawalsPanel';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    period?: string;
  }>;
}

export default async function AccountingWithdrawalsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userAskedAllTime, noExplicitPeriod, effectivePeriod } = resolveAccountingPeriod(params);
  const period = { dateFrom: effectivePeriod.dateFrom, dateTo: effectivePeriod.dateTo };
  const [withdrawalsResult, totals] = await Promise.all([
    getAccountingWithdrawals(period),
    sumWithdrawalsInRange(period),
  ]);
  const periodLabel = buildAccountingPeriodLabel(effectivePeriod, {
    userAskedAllTime,
    noExplicitPeriod,
  });

  const navCounts = { withdrawals: withdrawalsResult.withdrawals.length };

  return (
    <AccountingShellClient
      periodLabel={periodLabel}
      initialDateFrom={effectivePeriod.dateFrom}
      initialDateTo={effectivePeriod.dateTo}
      isAllTime={userAskedAllTime}
      navCounts={navCounts}
    >
      <AccountingWithdrawalsPanel
        withdrawalsData={{
          withdrawals: withdrawalsResult.withdrawals,
          periodTotal: totals.total,
          periodCount: totals.count,
          error: withdrawalsResult.error,
        }}
        periodLabel={periodLabel}
      />
    </AccountingShellClient>
  );
}
