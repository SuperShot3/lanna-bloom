import { getIncomeRecords } from '@/lib/accounting/incomeRecords';
import { IncomeListClient } from './IncomeListClient';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    source_mode?: string;
    source_type?: string;
    income_status?: string;
    page?: string;
  }>;
}

export default async function AdminIncomeListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const pageSize = 30;

  const filters = {
    dateFrom:      params.dateFrom,
    dateTo:        params.dateTo,
    source_mode:   params.source_mode,
    source_type:   params.source_type,
    income_status: params.income_status,
  };

  const result = await getIncomeRecords(filters, { page, pageSize });

  return (
    <IncomeListClient
      initialRecords={result.records}
      initialTotal={result.total}
      initialConfirmedAmount={result.totalConfirmedAmount}
      initialConfirmedStripeFees={result.totalConfirmedStripeFees}
      initialConfirmedNetAmount={result.totalConfirmedNetAmount}
      initialPendingAmount={result.totalPendingAmount}
      initialError={result.error}
      initialFilters={filters}
      initialPage={page}
      pageSize={pageSize}
    />
  );
}
