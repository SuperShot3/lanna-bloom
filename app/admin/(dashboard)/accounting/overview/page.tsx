import { getAccountingOverview } from '@/lib/accounting/incomeRecords';
import { buildAccountingPeriodLabel, resolveAccountingPeriod } from '../accounting-period';
import { AccountingShellClient } from '../AccountingShellClient';
import { AccountingOverviewPanel } from '../AccountingOverviewPanel';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    period?: string;
  }>;
}

export default async function AccountingOverviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userAskedAllTime, noExplicitPeriod, effectivePeriod } = resolveAccountingPeriod(params);
  const overview = await getAccountingOverview(effectivePeriod);
  const periodLabel = buildAccountingPeriodLabel(effectivePeriod, {
    userAskedAllTime,
    noExplicitPeriod,
  });

  const navCounts = overview
    ? {
        expenses: overview.expenseCount,
        income: overview.incomeCount,
        transfers: overview.transfersCount,
      }
    : undefined;

  return (
    <AccountingShellClient
      periodLabel={periodLabel}
      initialDateFrom={effectivePeriod.dateFrom}
      initialDateTo={effectivePeriod.dateTo}
      isAllTime={userAskedAllTime}
      navCounts={navCounts}
    >
      {overview === null ? (
        <div className="admin-error">
          <p>Failed to load accounting data. Check Supabase configuration.</p>
        </div>
      ) : (
        <AccountingOverviewPanel overview={overview} />
      )}
    </AccountingShellClient>
  );
}
