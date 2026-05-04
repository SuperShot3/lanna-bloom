import { getLedgerEntries } from '@/lib/accounting/ledger';
import { buildAccountingPeriodLabel, resolveAccountingPeriod } from '../accounting-period';
import { AccountingShellClient } from '../AccountingShellClient';
import { AccountingLedgerTable } from '../AccountingLedgerTable';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    period?: string;
  }>;
}

export default async function AccountingLedgerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userAskedAllTime, noExplicitPeriod, effectivePeriod } = resolveAccountingPeriod(params);
  const period = { dateFrom: effectivePeriod.dateFrom, dateTo: effectivePeriod.dateTo };
  const ledger = await getLedgerEntries(period);
  const periodLabel = buildAccountingPeriodLabel(effectivePeriod, {
    userAskedAllTime,
    noExplicitPeriod,
  });

  const navCounts = { ledger: ledger.rows.length };

  return (
    <AccountingShellClient
      periodLabel={periodLabel}
      initialDateFrom={effectivePeriod.dateFrom}
      initialDateTo={effectivePeriod.dateTo}
      isAllTime={userAskedAllTime}
      navCounts={navCounts}
    >
      <AccountingLedgerTable ledger={ledger} periodLabel={periodLabel} />
    </AccountingShellClient>
  );
}
