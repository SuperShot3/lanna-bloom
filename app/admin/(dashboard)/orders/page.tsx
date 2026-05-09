import { getOrders, getDistricts, getDeliveryDestinations } from '@/lib/supabase/adminQueries';
import { DELIVERY_DESTINATIONS } from '@/lib/delivery/markets';
import { DeliveryBoardClient } from './DeliveryBoardClient';
import { shopTodayYmd } from '@/lib/shopTime';

interface PageProps {
  searchParams: Promise<{
    orderId?: string;
    recipientPhone?: string;
    q?: string;
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
  const pageSize = 80;
  const today = shopTodayYmd();
  const hasRange = Boolean(params.dateFrom?.trim() || params.dateTo?.trim());
  const dateFrom = hasRange ? params.dateFrom?.trim() || params.dateTo?.trim() || today : today;
  const dateTo = hasRange ? params.dateTo?.trim() || params.dateFrom?.trim() || today : today;

  const filters = {
    orderId: params.orderId,
    recipientPhone: params.recipientPhone,
    q: params.q,
    orderStatus: params.status,
    paymentStatus: params.payment as 'paid' | 'unpaid' | undefined,
    district: params.district,
    deliveryDestination: params.destination,
    deliveryDateFrom: dateFrom,
    deliveryDateTo: dateTo,
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
    <DeliveryBoardClient
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
