'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiltersBar } from '@/app/admin-v2/components/FiltersBar';
import { OrderTable } from '@/app/admin-v2/components/OrderTable';
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
  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const handleFilterChange = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v);
      else next.delete(k);
    });
    router.push(`/admin-v2/orders?${next.toString()}`);
  };

  const totalPages = Math.ceil(initialTotal / pageSize) || 1;

  return (
    <div className="admin-v2-orders">
      <header className="admin-v2-header">
        <div>
          <h1 className="admin-v2-title">Orders</h1>
          <p className="admin-v2-hint">Admin Dashboard v2 — Supabase</p>
        </div>
        <div className="admin-v2-header-actions">
          <Link href="/admin-v2/overview" className="admin-v2-link">
            Overview
          </Link>
          <a
            href={`/api/admin/orders/export?${searchParams.toString()}`}
            className="admin-v2-btn admin-v2-btn-outline"
            download
          >
            Export CSV
          </a>
          <a href="/api/auth/signout?callbackUrl=/admin-v2/login" className="admin-v2-btn admin-v2-btn-outline">
            Log out
          </a>
        </div>
      </header>

      <FiltersBar
        filters={initialFilters}
        districts={districts}
        onFilterChange={handleFilterChange}
      />

      {initialError ? (
        <div className="admin-v2-error">
          <p><strong>Error loading orders</strong></p>
          <p>{initialError}</p>
          <p className="admin-v2-error-hint">Check Supabase configuration and server logs.</p>
        </div>
      ) : (
        <>
          <OrderTable orders={initialOrders} returnTo={returnTo} />
          {initialOrders.length === 0 ? (
            <p className="admin-v2-empty">No orders found.</p>
          ) : (
            <div className="admin-v2-pagination">
              <span>
                Showing {(initialPage - 1) * pageSize + 1}–{Math.min(initialPage * pageSize, initialTotal)} of {initialTotal}
              </span>
              <div className="admin-v2-pagination-btns">
                <button
                  type="button"
                  disabled={initialPage <= 1}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams.toString());
                    next.set('page', String(initialPage - 1));
                    router.push(`/admin-v2/orders?${next.toString()}`);
                  }}
                  className="admin-v2-btn admin-v2-btn-sm"
                >
                  Previous
                </button>
                <span className="admin-v2-pagination-info">
                  Page {initialPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={initialPage >= totalPages}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams.toString());
                    next.set('page', String(initialPage + 1));
                    router.push(`/admin-v2/orders?${next.toString()}`);
                  }}
                  className="admin-v2-btn admin-v2-btn-sm"
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
