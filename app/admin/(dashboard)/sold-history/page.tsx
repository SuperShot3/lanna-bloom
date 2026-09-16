import { auth } from '@/auth';
import { canChangeStatus } from '@/lib/adminRbac';
import { redirect } from 'next/navigation';
import { fetchSoldProductsHistory } from '@/lib/admin/soldProductsHistory';
import { SoldProductsHistoryClient } from './SoldProductsHistoryClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ order?: string }>;
}

export default async function AdminSoldProductsHistoryPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canChangeStatus(role)) redirect('/admin');

  const params = await searchParams;
  const orderId = params.order?.trim() || null;

  const result = await fetchSoldProductsHistory();
  if (!result.ok) {
    return (
      <div className="admin-products-studio-empty">
        <p className="admin-error">Failed to load sold history: {result.error}</p>
      </div>
    );
  }

  return (
    <SoldProductsHistoryClient
      groups={result.data.groups}
      canEdit={canChangeStatus(role)}
      initialOrderId={orderId}
    />
  );
}
