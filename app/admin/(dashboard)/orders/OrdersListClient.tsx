'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FiltersBar } from '@/app/admin/components/FiltersBar';
import { OrderTable } from '@/app/admin/components/OrderTable';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';

interface OrdersListClientProps {
  initialOrders: SupabaseOrderRow[];
  initialTotal: number;
  initialError?: string;
  initialFilters: {
    orderId?: string;
    recipientPhone?: string;
    orderStatus?: string;
    paymentStatus?: string;
    district?: string;
    deliveryDateFrom?: string;
    deliveryDateTo?: string;
  };
  initialPage: number;
  pageSize: number;
  districts: string[];
}

export function OrdersListClient({
  initialOrders,
  initialTotal,
  initialError,
  initialFilters,
  initialPage,
  pageSize,
  districts,
}: OrdersListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const sp = searchParams ?? new URLSearchParams();
  const returnTo = `${pathname}${sp.toString() ? `?${sp.toString()}` : ''}`;

  const handleFilterChange = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v);
      else next.delete(k);
    });
    router.push(`/admin/orders?${next.toString()}`);
  };

  const totalPages = Math.ceil(initialTotal / pageSize) || 1;

  return (
    <div className="admin-orders">
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Order Management</h1>
          <p className="admin-hint">View and manage orders from Supabase</p>
        </div>
        <div className="admin-header-actions">
          <a
            href={`/api/admin/orders/export?${sp.toString()}`}
            className="admin-btn admin-btn-primary"
            download
          >
            Export CSV
          </a>
        </div>
      </header>

      <FiltersBar
        filters={initialFilters}
        districts={districts}
        onFilterChange={handleFilterChange}
      />

      {initialError ? (
        <div className="admin-error">
          <p><strong>Error loading orders</strong></p>
          <p>{initialError}</p>
          <p className="admin-error-hint">Check Supabase configuration and server logs.</p>
        </div>
      ) : (
        <>
          <OrderTable orders={initialOrders} returnTo={returnTo} />
          {initialOrders.length === 0 ? (
            <p className="admin-empty">No orders found.</p>
          ) : (
            <div className="admin-pagination">
              <span>
                Showing {(initialPage - 1) * pageSize + 1}–{Math.min(initialPage * pageSize, initialTotal)} of {initialTotal}
              </span>
              <div className="admin-pagination-btns">
                <button
                  type="button"
                  disabled={initialPage <= 1}
                  onClick={() => {
                    const next = new URLSearchParams(sp.toString());
                    next.set('page', String(initialPage - 1));
                    router.push(`/admin/orders?${next.toString()}`);
                  }}
                  className="admin-btn admin-btn-sm"
                >
                  Previous
                </button>
                <span className="admin-pagination-info">
                  Page {initialPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={initialPage >= totalPages}
                  onClick={() => {
                    const next = new URLSearchParams(sp.toString());
                    next.set('page', String(initialPage + 1));
                    router.push(`/admin/orders?${next.toString()}`);
                  }}
                  className="admin-btn admin-btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
