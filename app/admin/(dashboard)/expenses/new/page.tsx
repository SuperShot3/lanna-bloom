import { listExpenseCategories } from '@/lib/expenses/expenseCategoryQueries';
import { NewExpenseForm } from './NewExpenseForm';

export default async function AdminNewExpensePage() {
  const categoriesResult = await listExpenseCategories({ activeOnly: true });
  const categories = categoriesResult.ok ? categoriesResult.categories : [];
  return <NewExpenseForm categories={categories} />;
}
