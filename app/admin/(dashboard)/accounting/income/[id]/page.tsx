import { notFound } from 'next/navigation';
import { getIncomeRecordById } from '@/lib/accounting/incomeRecords';
import { IncomeDetailClient } from './IncomeDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminIncomeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const record = await getIncomeRecordById(id);
  if (!record) notFound();
  return <IncomeDetailClient record={record} />;
}
