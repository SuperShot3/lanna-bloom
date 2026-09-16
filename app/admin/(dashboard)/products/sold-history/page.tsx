import { auth } from '@/auth';
import { canChangeStatus } from '@/lib/adminRbac';
import { redirect } from 'next/navigation';
import { fetchSoldProductsHistory } from '@/lib/admin/soldProductsHistory';
import { SoldProductsHistoryClient } from './SoldProductsHistoryClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminSoldProductsHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canChangeStatus(role)) redirect('/admin');

  const result = await fetchSoldProductsHistory();
  if (!result.ok) {
    return (
      <div className="admin-products-studio-empty">
        <p className="admin-error">Failed to load sold history: {result.error}</p>
      </div>
    );
  }

  return <SoldProductsHistoryClient groups={result.data.groups} canEdit={canChangeStatus(role)} />;
}
