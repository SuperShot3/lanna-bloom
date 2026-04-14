import Link from 'next/link';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { getOrderByOrderId } from '@/lib/supabase/adminQueries';
import { itemsFromOrderJson } from '@/lib/admin/orderItemsFallback';
import { CostsAndProfitCard } from '@/app/admin/components/CostsAndProfitCard';
import { canEditCosts } from '@/lib/adminRbac';
import { getCogsExpenseByOrderId } from '@/lib/expenses/expenseQueries';

interface PageProps {
  params: Promise<{ order_id: string }>;
}

export default async function AccountingOrderCostsPage({ params }: PageProps) {
  const { order_id } = await params;
  const session = await auth();
  const role = session?.user ? (session.user as { role?: string }).role : undefined;
  const { order, items, error } = await getOrderByOrderId(order_id);
  const cogsExpense = await getCogsExpenseByOrderId(order_id);

  if (error) {
    return (
      <div className="admin-detail">
        <header className="admin-header admin-page-header">
          <Link href="/admin/accounting" className="admin-link">← Accounting</Link>
        </header>
        <div className="admin-error">
          <p><strong>Error loading order</strong></p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    notFound();
  }

  const jsonPayload = order.order_json as {
    items?: Array<{
      bouquetId?: string;
      bouquetTitle?: string;
      size?: string;
      price?: number;
      imageUrl?: string;
      itemType?: string;
      cost?: number;
      commissionAmount?: number;
    }>;
  } | undefined;
  const jsonItems = jsonPayload?.items ?? [];
  const itemsToUse =
    items.length > 0 ? items : jsonItems.length > 0 ? itemsFromOrderJson(order.order_id, jsonItems) : [];

  return (
    <div className="admin-detail">
      <header className="admin-header admin-page-header">
        <div>
          <Link href="/admin/accounting" className="admin-link" style={{ display: 'inline-block', marginBottom: 8 }}>
            ← Accounting
          </Link>
          <h1 className="admin-title">Order costs & profit</h1>
          <p className="admin-hint">
            Order <strong>{order.order_id}</strong> — COGS, delivery cost, payment fee, and profit
          </p>
        </div>
        <div className="admin-header-actions">
          <Link href={`/admin/orders/${encodeURIComponent(order.order_id)}`} className="admin-btn admin-btn-outline">
            View order
          </Link>
        </div>
      </header>

      <CostsAndProfitCard
        order={order}
        items={itemsToUse}
        canEdit={canEditCosts(role)}
        initialCogsExpense={cogsExpense}
      />
    </div>
  );
}
