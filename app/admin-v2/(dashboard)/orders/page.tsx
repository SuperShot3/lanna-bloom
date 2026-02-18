import { getOrders, getDistricts } from '@/lib/supabase/adminQueries';
import { OrdersListClient } from './OrdersListClient';

interface PageProps {
  searchParams: Promise<{
    orderId?: string;
    recipientPhone?: string;
    status?: string;
    payment?: string;
    district?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

export default async function AdminV2OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const pageSize = 20;

  const filters = {
    orderId: params.orderId,
    recipientPhone: params.recipientPhone,
    orderStatus: params.status,
    paymentStatus: params.payment as 'paid' | 'unpaid' | undefined,
    district: params.district,
    deliveryDateFrom: params.dateFrom,
    deliveryDateTo: params.dateTo,
  };

  const [result, districts] = await Promise.all([
    getOrders(filters, { page, pageSize }),
    getDistricts(),
  ]);

  return (
    <OrdersListClient
      initialOrders={result.orders}
      initialTotal={result.total}
      initialError={result.error}
      initialFilters={filters}
      initialPage={page}
      pageSize={pageSize}
      districts={districts}
    />
  );
}
