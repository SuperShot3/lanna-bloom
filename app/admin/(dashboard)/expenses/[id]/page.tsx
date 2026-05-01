import { notFound } from 'next/navigation';
import { ensureBillTrackingUpToDate, getExpenseById } from '@/lib/expenses/expenseQueries';
import { ExpenseDetailClient } from './ExpenseDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminExpenseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const raw = await getExpenseById(id);

  if (!raw) notFound();

  const expense = await ensureBillTrackingUpToDate(raw);

  return <ExpenseDetailClient expense={expense} />;
}
