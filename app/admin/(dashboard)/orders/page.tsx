import { getOrders, getDistricts, getDeliveryDestinations } from '@/lib/supabase/adminQueries';
import { DELIVERY_DESTINATIONS } from '@/lib/delivery/markets';
import { OrdersListClient } from './OrdersListClient';

interface PageProps {
  searchParams: Promise<{
    orderId?: string;
    recipientPhone?: string;
    status?: string;
    payment?: string;
    district?: string;
    destination?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const pageSize = 20;

  const filters = {
    orderId: params.orderId,
    recipientPhone: params.recipientPhone,
    orderStatus: params.status,
    paymentStatus: params.payment as 'paid' | 'unpaid' | undefined,
    district: params.district,
    deliveryDestination: params.destination,
    deliveryDateFrom: params.dateFrom,
    deliveryDateTo: params.dateTo,
  };

  const [result, districts, destRows] = await Promise.all([
    getOrders(filters, { page, pageSize }),
    getDistricts(),
    getDeliveryDestinations(),
  ]);

  const deliveryDestinations = Array.from(
    new Set([...DELIVERY_DESTINATIONS, ...destRows])
  ).sort();

  return (
    <OrdersListClient
      initialOrders={result.orders}
      initialTotal={result.total}
      initialError={result.error}
      initialFilters={filters}
      initialPage={page}
      pageSize={pageSize}
      districts={districts}
      deliveryDestinations={deliveryDestinations}
    />
  );
}
