import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    payment_method?: string;
    page?: string;
  }>;
}

export default async function AdminExpensesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const qs = new URLSearchParams({ tab: 'expenses' });
  if (params.dateFrom)       qs.set('dateFrom', params.dateFrom);
  if (params.dateTo)         qs.set('dateTo', params.dateTo);
  if (params.category)       qs.set('category', params.category);
  if (params.payment_method) qs.set('payment_method', params.payment_method);
  if (params.page)           qs.set('page', params.page);

  redirect(`/admin/accounting?${qs.toString()}`);
}
