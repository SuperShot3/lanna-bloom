import { unstable_noStore as noStore } from 'next/cache';

/** Match accounting: expense list/detail/new should reflect DB after client navigation without manual refresh. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  noStore();
  return children;
}
