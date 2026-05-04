import { Suspense } from 'react';
import { unstable_noStore as noStore } from 'next/cache';

/** Always load fresh data from Supabase when navigating within Accounting (no stale RSC cache). */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function AccountingRouteFallback() {
  return (
    <div className="admin-accounting" style={{ padding: '24px 0' }}>
      <p className="admin-hint">Loading accounting…</p>
    </div>
  );
}

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  noStore();
  return <Suspense fallback={<AccountingRouteFallback />}>{children}</Suspense>;
}
