import { notFound } from 'next/navigation';
import { ensureBillTrackingUpToDate, getExpenseById } from '@/lib/expenses/expenseQueries';
import { listExpenseCategories } from '@/lib/expenses/expenseCategoryQueries';
import { ExpenseDetailClient } from './ExpenseDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminExpenseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const raw = await getExpenseById(id);

  if (!raw) notFound();

  const [expense, categoriesResult] = await Promise.all([
    ensureBillTrackingUpToDate(raw),
    listExpenseCategories(),
  ]);
  const categories = categoriesResult.ok ? categoriesResult.categories : [];

  return <ExpenseDetailClient expense={expense} categories={categories} />;
}
