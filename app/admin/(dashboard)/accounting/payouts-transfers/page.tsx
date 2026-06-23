import { getAccountingTransfers } from '@/lib/accounting/transfers';
import { getAccountingWithdrawals, sumWithdrawalsInRange } from '@/lib/accounting/withdrawals';
import { buildAccountingPeriodLabel, resolveAccountingPeriod } from '../accounting-period';
import { AccountingShellClient } from '../AccountingShellClient';
import { AccountingTransfersPanel } from '../AccountingTransfersPanel';
import { AccountingWithdrawalsPanel } from '../AccountingWithdrawalsPanel';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    period?: string;
  }>;
}

export default async function AccountingPayoutsTransfersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userAskedAllTime, noExplicitPeriod, effectivePeriod } = resolveAccountingPeriod(params);
  const period = { dateFrom: effectivePeriod.dateFrom, dateTo: effectivePeriod.dateTo };
  const [transfersData, withdrawalsResult, totals] = await Promise.all([
    getAccountingTransfers(period),
    getAccountingWithdrawals(period),
    sumWithdrawalsInRange(period),
  ]);
  const periodLabel = buildAccountingPeriodLabel(effectivePeriod, {
    userAskedAllTime,
    noExplicitPeriod,
  });

  const navCounts = { transfers: transfersData.transfers.length };

  return (
    <AccountingShellClient
      periodLabel={periodLabel}
      initialDateFrom={effectivePeriod.dateFrom}
      initialDateTo={effectivePeriod.dateTo}
      isAllTime={userAskedAllTime}
      navCounts={navCounts}
    >
      <AccountingTransfersPanel transfersData={transfersData} periodLabel={periodLabel} />
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
