import { unstable_noStore as noStore } from 'next/cache';

/** Always load fresh data from Supabase when navigating within Accounting (no stale RSC cache). */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  noStore();
  return children;
}
