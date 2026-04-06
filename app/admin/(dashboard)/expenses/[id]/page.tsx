import { notFound } from 'next/navigation';
import { getExpenseById } from '@/lib/expenses/expenseQueries';
import { ExpenseDetailClient } from './ExpenseDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminExpenseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const expense = await getExpenseById(id);

  if (!expense) notFound();

  return <ExpenseDetailClient expense={expense} />;
}
