import { getAccountingOverview, getIncomeRecords } from '@/lib/accounting/incomeRecords';
import type { IncomeFilters } from '@/types/accounting';
import { IncomeListClient } from './IncomeListClient';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
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
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const pageSize = 30;

  const filters: IncomeFilters = {
    dateFrom:      params.dateFrom,
    dateTo:        params.dateTo,
    source_mode:   params.source_mode,
    source_type:   params.source_type,
    income_status: params.income_status,
    receipt:       isReceiptFilter(params.receipt) ? params.receipt : undefined,
  };

  const period = { dateFrom: params.dateFrom, dateTo: params.dateTo };
  const [result, overview] = await Promise.all([
    getIncomeRecords(filters, { page, pageSize }),
    getAccountingOverview(period),
  ]);

  return (
    <IncomeListClient
      initialRecords={result.records}
      initialTotal={result.total}
      initialConfirmedAmount={result.totalConfirmedAmount}
      initialConfirmedStripeFees={result.totalConfirmedStripeFees}
      initialPendingAmount={result.totalPendingAmount}
      initialMissingProofCount={result.missingProofCount}
      initialError={result.error}
      initialFilters={filters}
      initialPage={page}
      pageSize={pageSize}
      periodNetProfit={overview?.netResult}
    />
  );
}
